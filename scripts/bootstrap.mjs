#!/usr/bin/env node

/**
 * Bootstrap script for Memories: Our Little Universe
 * Usage: node scripts/bootstrap.mjs <owner_email> <owner_password> [space_slug] [space_title]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local');
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0] || process.env.INITIAL_OWNER_EMAIL;
const password = args[1] || process.env.INITIAL_OWNER_PASSWORD;
const spaceSlug = args[2] || process.env.DEFAULT_SPACE_SLUG || 'our-universe';
const spaceTitle = args[3] || process.env.DEFAULT_SPACE_TITLE || 'Our Little Universe';

if (!email || !password) {
  console.error('Usage: node scripts/bootstrap.mjs <owner_email> <owner_password> [space_slug] [space_title]');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function bootstrap() {
  console.log(`Starting bootstrap for space "${spaceTitle}" (${spaceSlug})...`);

  // 1. Find or create space
  let { data: space } = await supabase
    .from('spaces')
    .select('id, slug, public_title')
    .eq('slug', spaceSlug)
    .maybeSingle();

  if (!space) {
    const { data: newSpace, error: createError } = await supabase
      .from('spaces')
      .insert({
        slug: spaceSlug,
        public_title: spaceTitle,
        tagline: 'A constellation of our unforgettable moments',
        show_day_counter: false,
        theme: { accentColor: '#A78BFA' },
      })
      .select('id, slug, public_title')
      .single();

    if (createError) {
      console.error('Failed to create space:', createError.message);
      process.exit(1);
    }
    space = newSpace;
    console.log(`✓ Space created with ID: ${space.id}`);
  } else {
    console.log(`✓ Found existing space with ID: ${space.id}`);
  }

  // 2. Check if space already has an owner
  const { data: existingOwner } = await supabase
    .from('space_members')
    .select('user_id, role')
    .eq('space_id', space.id)
    .eq('role', 'owner')
    .maybeSingle();

  if (existingOwner) {
    console.error('Error: Space already has an owner configured! Cannot run bootstrap again.');
    process.exit(1);
  }

  // 3. Create or find user in auth
  let userId;
  const { data: userCreated, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) {
    if (authError.message.toLowerCase().includes('already registered')) {
      const { data: list } = await supabase.auth.admin.listUsers();
      const existing = list?.users.find((u) => u.email === email);
      if (!existing) {
        console.error('Failed to find existing auth user:', authError.message);
        process.exit(1);
      }
      userId = existing.id;
      console.log(`✓ Using existing auth user: ${userId}`);
    } else {
      console.error('Failed to create auth user:', authError.message);
      process.exit(1);
    }
  } else {
    userId = userCreated.user.id;
    console.log(`✓ Created new auth user: ${userId}`);
  }

  // 4. Assign user as owner in space_members
  const { error: memberError } = await supabase.from('space_members').insert({
    space_id: space.id,
    user_id: userId,
    role: 'owner',
  });

  if (memberError) {
    console.error('Failed to assign owner to space_members:', memberError.message);
    process.exit(1);
  }

  console.log('✓ Owner successfully assigned in space_members!');
  console.log('\n=============================================');
  console.log('🎉 Bootstrap completed successfully!');
  console.log(`Owner Email: ${email}`);
  console.log(`Space Slug:  ${space.slug}`);
  console.log(`Space ID:    ${space.id}`);
  console.log('=============================================\n');
}

bootstrap().catch((err) => {
  console.error('Unexpected bootstrap error:', err);
  process.exit(1);
});
