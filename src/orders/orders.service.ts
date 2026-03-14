import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { UsersService } from '../users/users.service';
import { Product } from '../products/product.entity';
@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemsRepository: Repository<OrderItem>,
    private productsService: ProductsService,
    private cartService: CartService,
    private usersService: UsersService,
    private dataSource: DataSource,
  ) {}

  async placeOrder(userId: number, createOrderDto: CreateOrderDto): Promise<Order> {
    // Use database transaction for data consistency
    return await this.dataSource.transaction(async (manager) => {

      let orderItems: { product: any; quantity: number; price: number }[] = [];

      // If items provided directly, use them
      if (createOrderDto.items && createOrderDto.items.length > 0) {
        for (const item of createOrderDto.items) {
          const product = await this.productsService.findOne(item.productId);

          // Check stock availability
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Not enough stock for "${product.name}". Available: ${product.stock}`
            );
          }

          orderItems.push({ product, quantity: item.quantity, price: product.price });
        }
      } else {
        // Use cart items
        const cart = await this.cartService.getCart(userId);

        if (cart.items.length === 0) {
          throw new BadRequestException('Your cart is empty');
        }

        for (const item of cart.items) {
          const product = await this.productsService.findOne(item.product.id);

          // Check stock availability
          if (product.stock < item.quantity) {
            throw new BadRequestException(
              `Not enough stock for "${product.name}". Available: ${product.stock}`
            );
          }

          orderItems.push({ product, quantity: item.quantity, price: product.price });
        }
      }

      // Calculate total on backend
      const total = orderItems.reduce((sum, item) => {
        return sum + Number(item.price) * item.quantity;
      }, 0);
      // Create order
      const order = manager.create(Order, {
        user: { id: userId },
        total,
        status: OrderStatus.PENDING,
      });

      const savedOrder = await manager.save(Order, order);

      // Create order items & deduct stock
      for (const item of orderItems) {
        // Create order item
        const orderItem = manager.create(OrderItem, {
          order: savedOrder,
          product: item.product,
          quantity: item.quantity,
          price: item.price,
        });
        await manager.save(OrderItem, orderItem);

        // Deduct stock from product to prevent negative inventory
        const newStock = item.product.stock - item.quantity;
        if (newStock < 0) {
          throw new BadRequestException(`Insufficient stock for "${item.product.name}"`);
        }
        await manager.update(Product, item.product.id, { stock: newStock });
      }

      // Clear cart after order placed
      await this.cartService.clearCart(userId);

// Return full order
      const fullOrder = await manager.findOne(Order, {
        where: { id: savedOrder.id },
        relations: ['items', 'items.product'],
      });

      if (!fullOrder) throw new NotFoundException('Order not found after creation');

      return fullOrder;
    });
  }

  async getMyOrders(userId: number): Promise<Order[]> {
    return this.ordersRepository.find({
      where: { user: { id: userId } },
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async getOrderById(userId: number, orderId: number, role: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) throw new NotFoundException('Order not found');

    // Customers can only see their own orders
    if (role !== 'admin' && order.user.id !== userId) {
      throw new ForbiddenException('You can only view your own orders');
    }

    return order;
  }

  async getAllOrders(): Promise<Order[]> {
    return this.ordersRepository.find({
      relations: ['items', 'items.product'],
      order: { createdAt: 'DESC' },
    });
  }

  async updateOrderStatus(orderId: number, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order> {
    const order = await this.ordersRepository.findOne({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');

    order.status = updateOrderStatusDto.status;
    return this.ordersRepository.save(order);
  }
  
  async cancelOrder(userId: number, orderId: number): Promise<{ message: string }> {
    const order = await this.ordersRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product'],
    });

    if (!order) throw new NotFoundException('Order not found');

    // Only owner can cancel
    if (order.user.id !== userId) {
      throw new ForbiddenException('You can only cancel your own orders');
    }

    // Can only cancel pending orders
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel order with status "${order.status}"`);
    }

    // Restore stock
    return await this.dataSource.transaction(async (manager) => {
      for (const item of order.items) {
        await manager.increment(Product, { id: item.product.id }, 'stock', item.quantity);
      }

      order.status = OrderStatus.CANCELLED;
      await manager.save(Order, order);

      return { message: 'Order cancelled and stock restored successfully' };
    });
  }
}