"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicUrl = exports.uploadToStorage = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = require("../config");
exports.supabase = (0, supabase_js_1.createClient)(config_1.config.supabaseUrl, config_1.config.supabaseServiceKey);
// Storage helper
const uploadToStorage = async (fileName, fileBuffer) => {
    const { data, error } = await exports.supabase.storage
        .from(config_1.config.supabaseBucket)
        .upload(fileName, fileBuffer, {
        contentType: 'application/pdf',
        upsert: true
    });
    if (error)
        throw error;
    return data;
};
exports.uploadToStorage = uploadToStorage;
// Get public URL
const getPublicUrl = (fileName) => {
    const { data } = exports.supabase.storage
        .from(config_1.config.supabaseBucket)
        .getPublicUrl(fileName);
    return data.publicUrl;
};
exports.getPublicUrl = getPublicUrl;
