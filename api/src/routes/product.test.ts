import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import productRouter, { productEvents, resetProducts } from './product';
import { products as seedProducts } from '../seedData';

let app: express.Express;

const withInventory = (quantity: number, reorderThreshold: number) => ({
  ...seedProducts[0],
  quantity,
  reorder_threshold: reorderThreshold
});

describe('Product API low-stock alerts', () => {
  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/products', productRouter);
    resetProducts();
    productEvents.removeAllListeners('low-stock');
  });

  it('should emit a low-stock alert when quantity drops below reorder threshold', async () => {
    await request(app).put('/products/1').send(withInventory(10, 10));

    const listener = vi.fn();
    productEvents.once('low-stock', listener);

    const response = await request(app).put('/products/1').send(withInventory(9, 10));

    expect(response.status).toBe(200);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith({
      productId: seedProducts[0].productId,
      quantity: 9,
      reorder_threshold: 10
    });
  });

  it('should not emit a low-stock alert when quantity equals reorder threshold', async () => {
    await request(app).put('/products/1').send(withInventory(11, 10));

    const listener = vi.fn();
    productEvents.once('low-stock', listener);

    const response = await request(app).put('/products/1').send(withInventory(10, 10));

    expect(response.status).toBe(200);
    expect(listener).not.toHaveBeenCalled();
  });
});
