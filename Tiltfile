v1alpha1.extension_repo(name='omni', url='https://github.com/omnidotdev/tilt-extensions')
v1alpha1.extension(name='dotenv_values', repo_name='omni', repo_path='dotenv_values')
load('ext://dotenv_values', 'dotenv_values')

local_resource(
  "dev",
  serve_cmd="bun dev",
)

local_resource(
  "build",
  "bun run build",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "check",
  "bun check",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "format",
  "bun format",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "lint",
  "bun lint",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "clean",
  "bun clean",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "install",
  "bun install",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "knip",
  "bun knip",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)

local_resource(
  "test",
  "bun run test",
  auto_init=False,
  trigger_mode=TRIGGER_MODE_MANUAL
)
