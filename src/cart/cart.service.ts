import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './cart.entity';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { ProductsService } from '../products/products.service';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    private productsService: ProductsService,
  ) {}

  async addToCart(userId: number, addToCartDto: AddToCartDto): Promise<Cart> {
    const product = await this.productsService.findOne(addToCartDto.productId);

    // Check stock availability
    if (product.stock < addToCartDto.quantity) {
      throw new BadRequestException(`Only ${product.stock} items available in stock`);
    }

    // Check if product already in cart
    const existingItem = await this.cartRepository.findOne({
      where: {
        user: { id: userId },
        product: { id: addToCartDto.productId },
      },
    });

    if (existingItem) {
      // Update quantity
      const newQuantity = existingItem.quantity + addToCartDto.quantity;
      if (product.stock < newQuantity) {
        throw new BadRequestException(`Only ${product.stock} items available in stock`);
      }
      existingItem.quantity = newQuantity;
      return this.cartRepository.save(existingItem);
    }

    // Create new cart item
    const cartItem = this.cartRepository.create({
      user: { id: userId },
      product,
      quantity: addToCartDto.quantity,
    });

    return this.cartRepository.save(cartItem);
  }

  async getCart(userId: number) {
    const items = await this.cartRepository.find({
      where: { user: { id: userId } },
    });

    const total = items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return { items, total };
  }

  async removeFromCart(userId: number, cartItemId: number): Promise<{ message: string }> {
    const cartItem = await this.cartRepository.findOne({
      where: { id: cartItemId, user: { id: userId } },
    });

    if (!cartItem) throw new NotFoundException('Cart item not found');

    await this.cartRepository.remove(cartItem);
    return { message: 'Item removed from cart' };
  }

  async clearCart(userId: number): Promise<void> {
    await this.cartRepository.delete({ user: { id: userId } });
  }
}