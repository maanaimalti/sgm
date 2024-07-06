import { createMock, type DeepMocked } from '@golevelup/ts-jest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ProductRepository } from 'src/shared/db/repositories/product-repository';
import { HelpersService } from '../../shared/helpers/helpers.service';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let productRepository: DeepMocked<ProductRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: HelpersService,
          useValue: createMock<HelpersService>({
            generateId: jest.fn(() => '1'),
          }),
        },
        {
          provide: ProductRepository,
          useValue: createMock<ProductRepository>(),
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    productRepository = module.get(ProductRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should generate id to product', async () => {
      const result = await service.create({
        name: 'Product',
        categoryId: '1',
        brandName: 'Brand',
        unityId: '1',
      });
      expect(result).toHaveProperty('id');
    });

    it('should save product on database', async () => {
      const fnSpyed = jest.spyOn(productRepository, 'create');
      const result = await service.create({
        name: 'Product',
        categoryId: '1',
        brandName: 'Brand',
        unityId: '1',
      });
      expect(result).toHaveProperty('id');
      expect(fnSpyed).toHaveBeenCalled();
    });

    it('should return product', async () => {
      const createdProduct = await service.create({
        name: 'Product',
        categoryId: '1',
        brandName: 'Brand',
        unityId: '1',
      });
      const result = await service.findOne('1');
      expect(result.id).toBe('1');
      expect(result.name).toBe(createdProduct.name);
      // expect(result.category.id).toBe(createdProduct.categoryId);
      expect(result.brandName).toBe(createdProduct.brandName);
      // expect(result.unity.id).toBe(createdProduct.unityId);
    });
  });
});
