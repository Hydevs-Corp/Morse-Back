import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma.service';
import { User } from '@prisma/client';

describe('UsersService', () => {
    let service: UsersService;
    let prismaService: jest.Mocked<PrismaService>;

    const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
    };

    const mockPrismaService = {
        user: {
            findUnique: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: PrismaService,
                    useValue: mockPrismaService,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
        prismaService = module.get(PrismaService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('user', () => {
        it('should return a user when found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

            const result = await service.user({ id: 1 });

            expect(result).toEqual(mockUser);
            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });

        it('should return null when user not found', async () => {
            mockPrismaService.user.findUnique.mockResolvedValue(null);

            const result = await service.user({ id: 999 });

            expect(result).toBeNull();
            expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
                where: { id: 999 },
            });
        });
    });

    describe('users', () => {
        it('should return an array of users', async () => {
            const mockUsers = [mockUser];
            mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

            const result = await service.users({});

            expect(result).toEqual(mockUsers);
            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
                skip: undefined,
                take: undefined,
                cursor: undefined,
                where: undefined,
                orderBy: undefined,
            });
        });

        it('should handle query parameters', async () => {
            const mockUsers = [mockUser];
            mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

            const params = {
                skip: 0,
                take: 10,
                where: { email: 'test@example.com' },
            };

            await service.users(params);

            expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
                params
            );
        });
    });

    describe('createUser', () => {
        it('should create a new user', async () => {
            const userData = {
                email: 'new@example.com',
                name: 'New User',
                password: 'hashedpassword',
            };
            const expectedUser = { ...mockUser, ...userData };

            mockPrismaService.user.create.mockResolvedValue(expectedUser);

            const result = await service.createUser(userData);

            expect(result).toEqual(expectedUser);
            expect(mockPrismaService.user.create).toHaveBeenCalledWith({
                data: userData,
            });
        });
    });

    describe('updateUser', () => {
        it('should update an existing user', async () => {
            const updateData = { name: 'Updated User' };
            const updatedUser = { ...mockUser, ...updateData };

            mockPrismaService.user.update.mockResolvedValue(updatedUser);

            const result = await service.updateUser({
                where: { id: 1 },
                data: updateData,
            });

            expect(result).toEqual(updatedUser);
            expect(mockPrismaService.user.update).toHaveBeenCalledWith({
                where: { id: 1 },
                data: updateData,
            });
        });
    });

    describe('deleteUser', () => {
        it('should delete a user', async () => {
            mockPrismaService.user.delete.mockResolvedValue(mockUser);

            const result = await service.deleteUser({ id: 1 });

            expect(result).toEqual(mockUser);
            expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
                where: { id: 1 },
            });
        });
    });
});
