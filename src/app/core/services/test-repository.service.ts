import {
  Injectable,
  inject,
} from '@angular/core';

import {
  DatabaseTest,
} from '../models';

import {
  SupabaseService,
} from './supabase.service';

@Injectable({
  providedIn: 'root',
})
export class TestRepositoryService {
  private readonly supabase =
    inject(SupabaseService);

  async getActiveTest(): Promise<DatabaseTest | null> {
    const {
      data,
      error,
    } = await this.supabase.client
      .from('tests')
      .select(`
        id,
        name,
        slug,
        description,
        estimated_minutes,
        version,
        is_active
      `)
      .eq('is_active', true)
      .order('version', {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(
        `Não foi possível carregar o teste: ${error.message}`,
      );
    }

    return data satisfies DatabaseTest | null;
  }
}
