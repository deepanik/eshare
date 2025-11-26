import { createClient } from '@supabase/supabase-js';

// Get environment variables (Vite uses import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://glfuhacswvonafwcrylk.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZnVoYWNzd3ZvbmFmd2NyeWxrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE2NDgzOTMsImV4cCI6MjA3NzIyNDM5M30.Jw5Xb71iD6ePGAHtyKeOIN1ZROcF5iRJWT8fKFQKyxE';

// Debug logging removed for performance

// Check if Supabase is properly configured
const isConfigured = supabaseUrl && supabaseAnonKey;

let supabase;

if (!isConfigured) {
  console.warn('Supabase environment variables not configured. Using mock client.');
  console.warn('Check your .env file and restart the dev server.');
  supabase = {
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      signUp: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      signInWithPassword: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      signInWithOAuth: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } }),
      signOut: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ data: { user: null }, error: { message: 'Supabase not configured' } })
    },
    from: () => ({
      select: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      insert: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      update: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      delete: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } }),
      upsert: () => Promise.resolve({ data: [], error: { message: 'Supabase not configured' } })
    }),
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => ({ unsubscribe: () => {} })
    }),
    removeChannel: () => {},
    rpc: () => Promise.resolve({ data: null, error: { message: 'Supabase not configured' } })
  };
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  });
}

export { supabase };

// Database schema functions
export const createTables = async () => {
  const { data, error } = await supabase.rpc('create_tables_if_not_exists');
  if (error) {
    console.error('Error creating tables:', error);
  }
  return { data, error };
};

// User management functions
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  return { data, error };
};

export const updateUserProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
};

// File management functions
export const createFileRecord = async (fileData) => {
  try {
    const { data, error } = await supabase
      .from('files')
      .insert(fileData)
      .select()
      .single();
    
    // If table doesn't exist or schema doesn't match, return error
    if (error) {
      // PGRST204 = column doesn't exist, 42P01 = table doesn't exist
      if (error.code === 'PGRST204' || error.code === '42P01' || 
          error.message?.includes('relation') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('column')) {
        // Schema mismatch - this is expected if table has different structure
        if (import.meta.env.DEV) {
          console.debug('Supabase files table schema mismatch (expected if using different schema):', error.message);
        }
        return { data: null, error };
      }
    }
    
    return { data, error };
  } catch (err) {
    // Silently handle schema mismatches
    if (import.meta.env.DEV) {
      console.debug('Error creating file record in Supabase (schema may differ):', err.message);
    }
    return { data: null, error: err };
  }
};

export const getFilesByUser = async (userId) => {
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const getFileById = async (fileId) => {
  try {
    const { data, error } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();
    
    // If table doesn't exist or schema doesn't match, return null data (expected)
    if (error) {
      // Suppress expected schema mismatch errors (400, 406, PGRST codes)
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST204' ||
          error.code === '400' || error.code === '406' ||
          error.message?.includes('relation') || error.message?.includes('does not exist') ||
          error.message?.includes('column') || error.message?.includes('Cannot coerce')) {
        // Schema mismatch - expected if table has different structure
        // Silently return null - this is expected behavior, app uses local storage
        return { data: null, error: null };
      }
    }
    
    return { data, error };
  } catch (err) {
    // Silently handle errors - Supabase is optional
    return { data: null, error: null };
  }
};

export const deleteFileRecord = async (fileId, userId) => {
  // Only allow deletion if user is the owner
  const { data, error } = await supabase
    .from('files')
    .delete()
    .eq('id', fileId)
    .eq('owner_id', userId)
    .select()
    .single();
  
  return { data, error };
};

// Encryption key management
export const createEncryptionKey = async (keyData) => {
  try {
    const { data, error } = await supabase
      .from('encryption_keys')
      .insert(keyData)
      .select()
      .single();
    
    // If table doesn't exist or schema doesn't match, return error
    if (error) {
      // 22P02 = invalid input syntax for type uuid (file_id is UUID but we're passing IPFS hash string)
      if (error.code === '22P02' || error.message?.includes('invalid input syntax for type uuid')) {
        // This means file_id column is UUID type but we're using IPFS hashes (strings)
        console.error('❌ Supabase encryption_keys table has file_id as UUID type, but we use IPFS hashes (strings).');
        console.error('📝 To fix this, run this SQL in your Supabase SQL Editor:');
        console.error('   ALTER TABLE encryption_keys ALTER COLUMN file_id TYPE TEXT;');
        return { data: null, error };
      }
      
      // PGRST204 = column doesn't exist, 42P01 = table doesn't exist
      if (error.code === 'PGRST204' || error.code === '42P01' || 
          error.message?.includes('relation') || 
          error.message?.includes('does not exist') ||
          error.message?.includes('column')) {
        // Schema mismatch - this is expected if table has different structure
        if (import.meta.env.DEV) {
          console.debug('Supabase encryption_keys table schema mismatch (expected if using different schema):', error.message);
        }
        return { data: null, error };
      }
    }
    
    return { data, error };
  } catch (err) {
    // Handle errors
    if (import.meta.env.DEV) {
      console.debug('Error creating encryption key in Supabase:', err.message);
    }
    return { data: null, error: err };
  }
};

export const getEncryptionKeysByUser = async (userId) => {
  const { data, error } = await supabase
    .from('encryption_keys')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

export const getEncryptionKeyByFile = async (fileId, userId) => {
  try {
    const { data, error } = await supabase
      .from('encryption_keys')
      .select('*')
      .eq('file_id', fileId)
      .eq('owner_id', userId)
      .single();
    
    // If table doesn't exist or schema doesn't match, return null data (expected)
    if (error) {
      // Suppress expected schema mismatch errors
      if (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST204' ||
          error.code === '400' || error.code === '406' ||
          error.message?.includes('relation') || error.message?.includes('does not exist') ||
          error.message?.includes('column') || error.message?.includes('Cannot coerce') ||
          error.message?.includes('invalid input syntax')) {
        // Schema mismatch - expected if table has different structure or doesn't exist
        // Silently return null - this is expected behavior, app uses local storage
        return { data: null, error: null };
      }
    }
    
    return { data, error };
  } catch (err) {
    // Silently handle errors - Supabase is optional, app uses local storage
    return { data: null, error: null };
  }
};

// File sharing and permissions
export const createFileShare = async (shareData) => {
  const { data, error } = await supabase
    .from('file_shares')
    .insert(shareData)
    .select()
    .single();
  
  return { data, error };
};

export const getFileShares = async (fileId) => {
  const { data, error } = await supabase
    .from('file_shares')
    .select('*')
    .eq('file_id', fileId);
  
  return { data, error };
};

export const getUserSharedFiles = async (userId) => {
  const { data, error } = await supabase
    .from('file_shares')
    .select(`
      *,
      files (*)
    `)
    .eq('shared_with_user_id', userId);
  
  return { data, error };
};

// Online users tracking
export const updateUserOnlineStatus = async (userId, isOnline) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update({ 
      is_online: isOnline,
      last_seen: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();
  
  return { data, error };
};

export const getOnlineUsers = async () => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, username, is_online, last_seen')
    .eq('is_online', true)
    .order('last_seen', { ascending: false });
  
  return { data, error };
};

// File pricing and purchases
export const createFilePurchase = async (purchaseData) => {
  const { data, error } = await supabase
    .from('file_purchases')
    .insert(purchaseData)
    .select()
    .single();
  
  return { data, error };
};

export const getUserPurchases = async (userId) => {
  const { data, error } = await supabase
    .from('file_purchases')
    .select(`
      *,
      files (*)
    `)
    .eq('buyer_id', userId);
  
  return { data, error };
};

export const getFilePurchases = async (fileId) => {
  try {
    const { data, error } = await supabase
      .from('file_purchases')
      .select(`
        *,
        user_profiles!file_purchases_buyer_id_fkey (username)
      `)
      .eq('file_id', fileId);
    
    // Suppress expected schema mismatch errors
    if (error && (error.code === 'PGRST116' || error.code === '42P01' || error.code === 'PGRST204' ||
        error.code === '400' || error.code === '406' ||
        error.message?.includes('relation') || error.message?.includes('does not exist') ||
        error.message?.includes('column'))) {
      // Schema mismatch - expected if table doesn't exist or has different structure
      return { data: [], error: null };
    }
    
    return { data: data || [], error };
  } catch (err) {
    // Silently handle errors - Supabase is optional
    return { data: [], error: null };
  }
};