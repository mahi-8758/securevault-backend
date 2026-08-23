const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const archiver = require('archiver');

const backendRoot = path.resolve(__dirname, '..');
const buildRoot = path.join(backendRoot, 'lambda-build');
const sourceDependencies = require(path.join(backendRoot, 'package.json')).dependencies;

const packages = {
  upload: [
    'uuid',
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb'
  ],
  files: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb'
  ],
  download: [
    '@aws-sdk/client-s3',
    '@aws-sdk/s3-request-presigner',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb'
  ],
  audit: [
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb'
  ],
  delete: [
    '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/lib-dynamodb'
  ]
};

function runNpmInstall(packageDirectory) {
  const npmCommand = process.env.npm_execpath || 'npm';
  const npmArguments = process.env.npm_execpath
    ? [npmCommand, 'install', '--omit=dev', '--package-lock=true', '--ignore-scripts']
    : ['install', '--omit=dev', '--package-lock=true', '--ignore-scripts'];
  const result = spawnSync(
    process.env.npm_execpath ? process.execPath : npmCommand,
    npmArguments,
    { cwd: packageDirectory, stdio: 'inherit' }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`npm install failed for ${path.basename(packageDirectory)}.`);
  }
}

function buildPackage(name, dependencies) {
  const packageDirectory = path.join(buildRoot, name);
  const packageJson = {
    name: `securevault-lambda-${name}`,
    version: '1.0.0',
    private: true,
    main: 'index.js',
    dependencies: Object.fromEntries(dependencies.map((dependency) => [dependency, sourceDependencies[dependency]]))
  };

  fs.mkdirSync(packageDirectory, { recursive: true });
  fs.copyFileSync(path.join(backendRoot, 'handlers', `${name}.js`), path.join(packageDirectory, 'index.js'));
  fs.writeFileSync(path.join(packageDirectory, 'package.json'), `${JSON.stringify(packageJson, null, 2)}\n`);
  runNpmInstall(packageDirectory);
}

function createZip(name) {
  return new Promise((resolve, reject) => {
    const packageDirectory = path.join(buildRoot, name);
    const lambdaPackagesRoot = path.join(backendRoot, '..', 'securevault-infrastructure', 'lambda-packages');
    const outputZipPath = path.join(lambdaPackagesRoot, `${name}.zip`);
    
    fs.mkdirSync(lambdaPackagesRoot, { recursive: true });
    
    const output = fs.createWriteStream(outputZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    output.on('close', () => {
      console.log(`ZIP created: ${outputZipPath} (${archive.pointer()} bytes)`);
      resolve();
    });
    
    archive.on('error', (err) => {
      reject(err);
    });
    
    archive.pipe(output);
    archive.directory(packageDirectory, false);
    archive.finalize();
  });
}

async function createAllZips() {
  const names = Object.keys(packages);
  for (const name of names) {
    await createZip(name);
  }
}

try {
  fs.rmSync(buildRoot, { recursive: true, force: true });
  fs.mkdirSync(buildRoot, { recursive: true });

  for (const [name, dependencies] of Object.entries(packages)) {
    buildPackage(name, dependencies);
  }

  console.log(`Lambda packages created in ${buildRoot}`);
  
  createAllZips().then(() => {
    console.log('All Lambda ZIPs created successfully in securevault-infrastructure/lambda-packages');
  }).catch((error) => {
    console.error('ZIP creation failed:', error.message);
    process.exitCode = 1;
  });
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}