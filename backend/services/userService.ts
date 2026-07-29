import { userRepository, IUserRepository } from '../repositories/userRepository.js';
import { UserEntity } from '../entities/index.js';
import { NotFoundError } from '../shared/errors.js';
import { generateId } from '../shared/utils.js';

export class UserService {
  constructor(private userRepo: IUserRepository = userRepository) {}

  public getUsers(): UserEntity[] {
    return this.userRepo.findAll();
  }

  public getUserById(id: string): UserEntity {
    const user = this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }
    return user;
  }

  public createUser(userData: Partial<UserEntity> & { name: string; email: string }): UserEntity {
    const user: UserEntity = {
      id: generateId('usr'),
      name: userData.name,
      email: userData.email,
      role: userData.role || 'RESEARCHER',
      avatarUrl: userData.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    return this.userRepo.create(user);
  }

  public updateUser(id: string, updates: Partial<UserEntity>): UserEntity {
    this.getUserById(id);
    const updated = this.userRepo.update(id, updates);
    if (!updated) {
      throw new NotFoundError(`User with ID ${id} not found.`);
    }
    return updated;
  }
}

export const userService = new UserService();
