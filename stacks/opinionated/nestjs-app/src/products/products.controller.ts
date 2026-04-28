import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }

  @Get()
  findAll(@Query('min_price') minPrice?: string, @Query('max_price') maxPrice?: string) {
    return this.productsService.findAll(minPrice, maxPrice);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}
