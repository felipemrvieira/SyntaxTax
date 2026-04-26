import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const orderInclude = {
  user: true,
  items: {
    orderBy: { id: 'asc' as const },
  },
};

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: createOrderDto.user_id },
    });

    if (!user) {
      throw new NotFoundException({ detail: 'User not found' });
    }

    const productIds = [...new Set(createOrderDto.items.map((item) => item.product_id))];
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
    });

    if (products.length !== productIds.length) {
      throw new NotFoundException({ detail: 'Product not found' });
    }

    const productsById = new Map(products.map((product) => [product.id, product]));
    const total = createOrderDto.items.reduce((sum, item) => {
      const product = productsById.get(item.product_id);
      if (!product) {
        throw new BadRequestException({ detail: 'Invalid product' });
      }
      return sum + product.price * item.quantity;
    }, 0);

    const order = await this.prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          userId: createOrderDto.user_id,
          total,
          status: 'created',
        },
      });

      await tx.orderItem.createMany({
        data: createOrderDto.items.map((item) => ({
          orderId: createdOrder.id,
          productId: item.product_id,
          quantity: item.quantity,
          unitPrice: productsById.get(item.product_id)!.price,
        })),
      });

      return createdOrder;
    });

    const detailedOrder = await this.prisma.order.findUnique({
      where: { id: order.id },
      include: orderInclude,
    });

    if (!detailedOrder) {
      throw new NotFoundException({ detail: 'Order not found' });
    }

    return this.serializeOrder(detailedOrder);
  }

  async findAll() {
    const orders = await this.prisma.order.findMany({
      orderBy: { id: 'asc' },
      include: orderInclude,
    });

    return orders.map((order) => this.serializeOrder(order));
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: orderInclude,
    });

    if (!order) {
      throw new NotFoundException({ detail: 'Order not found' });
    }

    return this.serializeOrder(order);
  }

  async updateStatus(id: number, updateOrderStatusDto: UpdateOrderStatusDto) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!existingOrder) {
      throw new NotFoundException({ detail: 'Order not found' });
    }

    await this.prisma.order.update({
      where: { id },
      data: {
        status: updateOrderStatusDto.status,
      },
    });

    return this.findOne(id);
  }

  private serializeOrder(order: {
    id: number;
    total: number;
    status: string;
    createdAt: Date;
    user: { id: number; name: string };
    items: { productId: number; quantity: number; unitPrice: number }[];
  }) {
    return {
      id: order.id,
      user: {
        id: order.user.id,
        name: order.user.name,
      },
      items: order.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      total: order.total,
      status: order.status,
      created_at: order.createdAt.toISOString(),
    };
  }
}
