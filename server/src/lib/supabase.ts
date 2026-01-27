import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

export const supabase = createClient(
    config.supabaseUrl,
    config.supabaseServiceKey
);

// Storage helper
export const uploadToStorage = async (fileName: string, fileBuffer: Buffer) => {
    const { data, error } = await supabase.storage
        .from(config.supabaseBucket)
        .upload(fileName, fileBuffer, {
            contentType: 'application/pdf',
            upsert: true
        });
    
    if (error) throw error;
    return data;
};

// Get public URL
export const getPublicUrl = (fileName: string) => {
    const { data } = supabase.storage
        .from(config.supabaseBucket)
        .getPublicUrl(fileName);
    return data.publicUrl;
};

// Download file buffer
export const downloadFromStorage = async (filePath: string): Promise<Buffer> => {
    const { data, error } = await supabase.storage
        .from(config.supabaseBucket)
        .download(filePath);

    if (error) throw error;
    
    return Buffer.from(await data.arrayBuffer());
};
