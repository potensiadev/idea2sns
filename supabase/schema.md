# Supabase Schema — OneSNS.ai MVP

This schema captures the minimum tables, relationships, and RLS needed to support the MVP features (multi-platform generation, variations, blog repurposing, brand voice, limits, and history).

## Tables and columns

### `profiles`
| column | type | constraints | description |
| --- | --- | --- | --- |
| user_id | uuid | pk, references auth.users(id) | Auth user foreign key. |
| plan | text | not null default 'free' | Current plan (`free`, `pro`). |
| industry | text | | Optional onboarding detail. |
| preferred_platforms | text[] | | Defaults used by generators. |
| tone | text | | Preferred tone keyword. |
| daily_generation_count | int | not null default 0 | Usage counter for free-tier caps. |
| last_generation_at | timestamptz | | Tracks reset boundary. |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### `brand_voices`
| column | type | constraints | description |
| --- | --- | --- | --- |
| id | uuid | pk default gen_random_uuid() | |
| user_id | uuid | references auth.users(id) not null | Owner. |
| label | text | | Optional name (e.g., "Main"). |
| samples | text[] | | Raw user-provided snippets. |
| extracted_style | jsonb | | Output from brand voice extractor (tone, cadence, vocab). |
| is_active | boolean | not null default false | Active profile flag. |
| created_at | timestamptz | default now() | |

### `generations`
| column | type | constraints | description |
| --- | --- | --- | --- |
| id | uuid | pk default gen_random_uuid() | |
| user_id | uuid | references auth.users(id) not null | Owner. |
| source | text | not null | `idea` or `blog`. |
| topic | text | | Short topic or idea. |
| content | text | | Supporting text or blog body. |
| tone | text | | Tone requested. |
| platforms | text[] | not null | Target platforms. |
| outputs | jsonb | not null | Per-platform generated text. |
| variant_type | text | not null default 'original' | `original`, `shorter`, `longer`, `casual`, `hook`. |
| parent_generation_id | uuid | references generations(id) | Links variations to original. |
| tokens_used | int | | For cost tracking. |
| created_at | timestamptz | default now() | |

### `usage_events`
| column | type | constraints | description |
| --- | --- | --- | --- |
| id | bigserial | pk | |
| user_id | uuid | references auth.users(id) not null | Owner. |
| event_type | text | not null | `generation`, `variation`, `copy`, `blog_repurpose`. |
| meta | jsonb | | Context (platforms, lengths). |
| created_at | timestamptz | default now() | |

### `subscriptions`
| column | type | constraints | description |
| --- | --- | --- | --- |
| user_id | uuid | pk references auth.users(id) | Owner. |
| plan | text | not null default 'free' | `free`, `pro`. |
| status | text | not null default 'active' | `active`, `past_due`, `canceled`. |
| renewal_date | date | | Billing cycle info. |
| limits | jsonb | | Cached limit config (e.g., daily generations). |
| created_at | timestamptz | default now() | |
| updated_at | timestamptz | default now() | |

### `blog_sources`
| column | type | constraints | description |
| --- | --- | --- | --- |
| id | uuid | pk default gen_random_uuid() | |
| user_id | uuid | references auth.users(id) not null | Owner. |
| title | text | | Optional reference. |
| url | text | | Optional source URL. |
| raw_content | text | | Full article text. |
| summary | text | | Extracted summary used for repurposing. |
| created_at | timestamptz | default now() | |

## Relationships
- `profiles.user_id` → `auth.users.id` (1–1 profile per auth user).
- `brand_voices.user_id` → `auth.users.id` (user can own many brand voices; at most one active).
- `generations.user_id` → `auth.users.id` (history entries per user).
- `generations.parent_generation_id` self-references for variations.
- `usage_events.user_id` → `auth.users.id` (analytics trail per user).
- `subscriptions.user_id` → `auth.users.id` (plan state per user).
- `blog_sources.user_id` → `auth.users.id` (source material per user).

## RLS policies (by table)
> Enable RLS on all tables and rely on authenticated user ID equality.

**profiles**
- `allow_self_access`: `(auth.uid() = user_id)` for all operations.
- `prevent_cross_user`: `using (auth.uid() = user_id)` for select/update/delete.

**brand_voices**
- `allow_owner`: `auth.uid() = user_id` for select/insert/update/delete.
- Optional helper: partial index to enforce single active profile per user: `create unique index on brand_voices(user_id) where is_active`.

**generations**
- `allow_owner`: `auth.uid() = user_id` for select/insert/update/delete.
- Variations inherit ownership via `parent_generation_id` checks executed in edge functions.

**usage_events**
- `allow_owner`: `auth.uid() = user_id` for select/insert.
- No updates/deletes (append-only) — deny by omission.

**subscriptions**
- `allow_owner_read`: `auth.uid() = user_id` for select.
- `service_write_only`: only `service_role` can insert/update to prevent client tampering (`auth.role() = 'service_role'`).

**blog_sources**
- `allow_owner`: `auth.uid() = user_id` for select/insert/update/delete.

## Sample rows

### profiles
| user_id | plan | industry | preferred_platforms | tone |
| --- | --- | --- | --- | --- |
| 11111111-1111-1111-1111-111111111111 | free | SaaS | {twitter,instagram} | concise |
| 22222222-2222-2222-2222-222222222222 | pro | ecommerce | {instagram,threads,reddit} | playful |

### brand_voices
| id | user_id | label | is_active | extracted_style |
| --- | --- | --- | --- | --- |
| aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa | 22222222-2222-2222-2222-222222222222 | "Main" | true | {"tone":"confident","cadence":"short sentences","vocab":["conversion","growth"]} |

### generations
| id | user_id | source | topic | platforms | variant_type | outputs |
| --- | --- | --- | --- | --- | --- | --- |
| g111... | 11111111-1111-1111-1111-111111111111 | idea | "AI launch tips" | {twitter,instagram} | original | {"twitter":"280c post...","instagram":"caption..."} |
| g222... | 22222222-2222-2222-2222-222222222222 | blog | "Q4 recap" | {threads,reddit} | hook | {"threads":"Multi-line...","reddit":"Story format..."} |

### usage_events
| id | user_id | event_type | meta |
| --- | --- | --- | --- |
| 1 | 11111111-1111-1111-1111-111111111111 | generation | {"platforms":["twitter","instagram"]} |
| 2 | 22222222-2222-2222-2222-222222222222 | variation | {"parent":"g222...","types":["shorter","hook"]} |

### subscriptions
| user_id | plan | status | limits |
| --- | --- | --- | --- |
| 11111111-1111-1111-1111-111111111111 | free | active | {"daily_generations":5,"variations":0} |
| 22222222-2222-2222-2222-222222222222 | pro | active | {"daily_generations":999,"variations":999} |

### blog_sources
| id | user_id | title | summary |
| --- | --- | --- | --- |
| b111... | 22222222-2222-2222-2222-222222222222 | "How we doubled CTR" | "Key findings and bullets..." |
