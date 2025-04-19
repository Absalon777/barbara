const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

const supabaseUrl = 'https://gndhowliybqjqrxdedwm.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImduZGhvd2xpeWJxanFyeGRlZHdtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcwOTk2NDQwMCwiZXhwIjoyMDI1NTQwNDAwfQ.ZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZQZq'
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetAdminPassword() {
  try {
    // Generar hash de la nueva contraseña
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash('Admin123', salt)

    // Actualizar la contraseña del administrador
    const { error } = await supabase
      .from('usuarios')
      .update({ password_hash: hashedPassword })
      .eq('rut', '21.003.588-5')

    if (error) {
      console.error('Error al actualizar la contraseña:', error)
      return
    }

    console.log('Contraseña del administrador actualizada correctamente')
    console.log('Nueva contraseña: Admin123')
  } catch (error) {
    console.error('Error:', error)
  }
}

resetAdminPassword() 