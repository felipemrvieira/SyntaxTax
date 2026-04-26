import { Module } from '@nestjs/common';

import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [PrismaModule, UsersModule, ProductsModule, OrdersModule],
})
export class AppModule {}
