import { Controller, Get, Post, Body, Param, Patch, UseGuards, Request } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth()
@Controller('orders')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OrdersController {
  constructor(private ordersService: OrdersService) {}

  //Customer for place order
  @Post()
  @Roles(Role.CUSTOMER)
  placeOrder(@Request() req, @Body() createOrderDto: CreateOrderDto) {
    return this.ordersService.placeOrder(req.user.id, createOrderDto);
  }

  // Customer for get my orders
  @Get('my-orders')
  @Roles(Role.CUSTOMER)
  getMyOrders(@Request() req) {
    return this.ordersService.getMyOrders(req.user.id);
  }

  // Admin get all orders
  @Get()
  @Roles(Role.ADMIN)
  getAllOrders() {
    return this.ordersService.getAllOrders();
  }

  // Both get order by ID (Customer can only access their own orders, Admin can access any order)
  @Get(':id')
  getOrderById(@Request() req, @Param('id') id: string) {
    return this.ordersService.getOrderById(req.user.id, +id, req.user.role);
  }

  // Admin for update order status
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  updateOrderStatus(@Param('id') id: string, @Body() updateOrderStatusDto: UpdateOrderStatusDto) {
    return this.ordersService.updateOrderStatus(+id, updateOrderStatusDto);
  }

  // Customer can cancel order
  @Patch(':id/cancel')
  @Roles(Role.CUSTOMER)
  cancelOrder(@Request() req, @Param('id') id: string) {
    return this.ordersService.cancelOrder(req.user.id, +id);
  }
}