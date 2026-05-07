import { BaseRepository } from './BaseRepository';
import { Category } from '../types';
import { dbService } from '../DatabaseService';

export class CategoryRepository extends BaseRepository<Category> {
  constructor() {
    super('categories');
  }

  async create(category: Category): Promise<void> {
    await dbService.run(
      `INSERT INTO categories (id, name, icon, color, type, is_default) VALUES (?, ?, ?, ?, ?, ?)`,
      [category.id, category.name, category.icon, category.color, category.type, category.is_default]
    );
  }

  async update(category: Category): Promise<void> {
    await dbService.run(
      `UPDATE categories SET name = ?, icon = ?, color = ?, type = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [category.name, category.icon, category.color, category.type, category.is_default, category.id]
    );
  }

  async findByType(type: 'income' | 'expense'): Promise<Category[]> {
    const result = await dbService.query(`SELECT * FROM categories WHERE type = ? ORDER BY name ASC`, [type]);
    return (result.values as Category[]) || [];
  }
}

export const categoryRepo = new CategoryRepository();
