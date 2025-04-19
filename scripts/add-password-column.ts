const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://gndhowliybqjqrxdedwm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGhvd2xpeWJxanFyeGRlZHdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTk2NDQwMCwiZXhwIjoyMDI1NTQwNDAwfQ.ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZq'
const supabase = createClient(supabaseUrl, supabaseKey)

async function addPasswordColumn() {
  try {
    const { error } = await supabase.rpc('add_password_hash_column')

    if (error) {
      console.error('Error al agregar la columna:', error)
      return
    }

    console.log('Columna password_hash agregada correctamente')
  } catch (error) {
    console.error('Error:', error)
  }
}

addPasswordColumn() 