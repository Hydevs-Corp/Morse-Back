import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('AuthService', () => {
    let service: AuthService;
    let usersService: jest.Mocked<UsersService>;
    let jwtService: jest.Mocked<JwtService>;
    let configService: jest.Mocked<ConfigService>;

    const mockUser: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        password: 'hashedpassword',
        avatar: 'http://example.com/avatar.png',
    };

    const mockUsersService = {
        user: jest.fn(),
    };

    const mockJwtService = {
        sign: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: UsersService,
                    useValue: mockUsersService,
                },
                {
                    provide: JwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        usersService = module.get(UsersService);
        jwtService = module.get(JwtService);
        configService = module.get(ConfigService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateUser', () => {
        it('should return user data when credentials are valid', async () => {
            const password = 'password123';
            usersService.user.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(true as never);

            const result = await service.validateUser(mockUser.email, password);

            const { password: _, ...expectedResult } = mockUser;
            expect(result).toEqual(expectedResult);
            expect(usersService.user).toHaveBeenCalledWith({
                email: mockUser.email,
            });
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(
                password,
                mockUser.password
            );
        });

        it('should return null when user is not found', async () => {
            usersService.user.mockResolvedValue(null);

            const result = await service.validateUser(
                'nonexistent@example.com',
                'password'
            );

            expect(result).toBeNull();
            expect(usersService.user).toHaveBeenCalledWith({
                email: 'nonexistent@example.com',
            });
            expect(mockedBcrypt.compare).not.toHaveBeenCalled();
        });

        it('should return null when password is invalid', async () => {
            usersService.user.mockResolvedValue(mockUser);
            mockedBcrypt.compare.mockResolvedValue(false as never);

            const result = await service.validateUser(
                mockUser.email,
                'wrongpassword'
            );

            expect(result).toBeNull();
            expect(usersService.user).toHaveBeenCalledWith({
                email: mockUser.email,
            });
            expect(mockedBcrypt.compare).toHaveBeenCalledWith(
                'wrongpassword',
                mockUser.password
            );
        });
    });

    describe('login', () => {
        it('should return access token for valid user', async () => {
            const userWithoutPassword = {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
            };
            const expectedToken = 'jwt-token';
            const jwtSecret = 'test-secret';

            configService.get.mockReturnValue(jwtSecret);
            jwtService.sign.mockReturnValue(expectedToken);

            const result = await service.login(userWithoutPassword);

            expect(result).toEqual({ access_token: expectedToken });
            expect(configService.get).toHaveBeenCalledWith('JWT_SECRET');
            expect(jwtService.sign).toHaveBeenCalledWith(
                {
                    email: userWithoutPassword.email,
                    sub: userWithoutPassword.id,
                },
                { secret: jwtSecret }
            );
        });

        it('should use empty string as default secret when JWT_SECRET is not configured', async () => {
            const userWithoutPassword = {
                id: mockUser.id,
                email: mockUser.email,
                name: mockUser.name,
            };
            const expectedToken = 'jwt-token';

            configService.get.mockReturnValue(undefined);
            jwtService.sign.mockReturnValue(expectedToken);

            const result = await service.login(userWithoutPassword);

            expect(result).toEqual({ access_token: expectedToken });
            expect(jwtService.sign).toHaveBeenCalledWith(
                {
                    email: userWithoutPassword.email,
                    sub: userWithoutPassword.id,
                },
                { secret: '' }
            );
        });
    });
});
