cd backend/extern/afv-native
git pull origin $1
cd ../../../
pnpm run build:backend-fast
