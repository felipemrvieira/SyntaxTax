import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateProductDto) {
    return this.prisma.product.create({
      data,
    });
  }

  findAll(minPrice?: string, maxPrice?: string) {
    const where: { price?: { gte?: number; lte?: number } } = {};
    if (minPrice !== undefined) {
      const parsed = this.parsePositiveNumber(minPrice, 'min_price');
      where.price = { ...where.price, gte: parsed };
    }
    if (maxPrice !== undefined) {
      const parsed = this.parsePositiveNumber(maxPrice, 'max_price');
      where.price = { ...where.price, lte: parsed };
    }

    return this.prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException({ detail: 'Product not found' });
    }

    return product;
  }

  private parsePositiveNumber(value: string, name: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new UnprocessableEntityException({ detail: `Query parameter '${name}' is invalid` });
    }
    return parsed;
  }
}
