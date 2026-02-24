# Deploy script for Windows (PowerShell)

# 1. Build the project
echo "Building project..."
npm run build

# 2. Navigate into the build output directory
cd dist

# 3. Initialize a new git repository for deployment
git init
git config user.email "deploy@example.com"
git config user.name "Deploy Script"
git checkout -B main
git add -A
git commit -m 'deploy'

# 4. Push to the gh-pages branch of the repository
# NOTE: Using the repository URL provided by the user
git push -f https://github.com/asagredoavanzasmart-ia/r1.git main:gh-pages

cd ..
echo "Deploy complete! Check https://asagredoavanzasmart-ia.github.io/r1/"
