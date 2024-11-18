/**
 * @type {import('electron-builder').Configuration}
 * @see https://www.electron.build/configuration/configuration
 */
module.exports = {
  appId: 'com.vatsim.trackaudio',
  productName: 'TrackAudio',
  directories: {
    buildResources: 'build',
    output: 'release'
  },
  publish: {
    provider: 's3',
    bucket: 'trackaudio',
    region: 'eu-west-2'
  },
  files: [
    '!**/.vscode/*',
    '!src/*',
    '!electron.vite.config.{js,ts,mjs,cjs}',
    '!{.eslintignore,.eslintrc.cjs,.prettierignore,.prettierrc.yaml,dev-app-update.yml,CHANGELOG.md,README.md}',
    '!{.env,.env.*,.npmrc,pnpm-lock.yaml}',
    '!{.gitignore,.gitmodules,.sentryclirc,MANDATORY_VERSION}',
    '!{tsconfig.json,tsconfig.node.json,tsconfig.web.json}',
    '!backend/*'
  ],
  asarUnpack: ['resources/**', './src/renderer/src/assets/md80_error.mp3'],
  win: {
    executableName: 'trackaudio',
    target: [
      {
        target: 'nsis',
        arch: ['x64']
      }
    ],
    extraFiles: [
      {
        from: 'backend/build/Release/',
        to: '.',
        filter: ['*.dll']
      },
      {
        from: 'resources/',
        to: 'resources/',
        filter: ['*.wav']
      },
      {
        from: 'euroscope-launcher/build/bin/',
        to: '.',
        filter: ['EuroScopeWithTrackAudio.exe']
      }
    ]
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    artifactName: '${name}-${version}-${arch}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    include: 'build/installer.nsh',
    menuCategory: true,
    displayLanguageSelector: false
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: true,
    extraFiles: [
      {
        from: 'resources/',
        to: 'Resources/',
        filter: ['*.wav']
      }
    ]
  },
  dmg: {
    artifactName: '${name}-${version}-${arch}.${ext}'
  },
  linux: {
    target: ['AppImage', 'snap', 'deb'],
    maintainer: 'pierr3',
    category: 'Game',
    extraFiles: [
      {
        from: 'resources/',
        to: 'resources/',
        filter: ['*.wav']
      }
    ]
  },
  appImage: {
    artifactName: '${name}-${version}-${arch}.${ext}'
  },
  npmRebuild: false,
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  }
};
