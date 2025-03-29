import { Test, TestingModule } from '@nestjs/testing';
import { AttendantController } from './attendant.controller';
import { AttendantService } from './attendant.service';

describe('AttendantController', () => {
  let controller: AttendantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AttendantController],
      providers: [AttendantService],
    }).compile();

    controller = module.get<AttendantController>(AttendantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
