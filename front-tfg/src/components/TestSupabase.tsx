'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export function TestSupabase() {
  useEffect(() => {
    async function test() {
      const { data, error } = await supabase.from('users').select('*');

      if (error) {
        console.error('❌ Error Supabase:', error);
      } else {
        console.log('✅ Supabase OK. Usuarios:', data);
      }
    }

    test();
  }, []);

  // No hace falta mostrar nada en pantalla, solo probamos la conexión
  return null;
}
