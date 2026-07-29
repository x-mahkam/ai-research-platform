import { BaseRepository } from './baseRepository.js';
import { UserEntity } from '../entities/index.js';

export interface IUserRepository {
  findAll(): UserEntity[];
  findById(id: string): UserEntity | undefined;
  findByEmail(email: string): UserEntity | undefined;
  create(user: UserEntity): UserEntity;
  update(id: string, updates: Partial<UserEntity>): UserEntity | undefined;
}

export class UserRepository extends BaseRepository<UserEntity> implements IUserRepository {
  constructor() {
    super('users');
  }

  public findByEmail(email: string): UserEntity | undefined {
    return this.findAll((u) => u.email.toLowerCase() === email.toLowerCase())[0];
  }
}

export const userRepository = new UserRepository();
