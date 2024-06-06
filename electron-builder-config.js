module.exports = {
  appId: 'com.vatsim.trackaudio',
  productName: 'TrackAudio',
  directories: {
    buildResources: 'build'
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
  asarUnpack: ['resources/**'],
  win: {
    executableName: 'trackaudio',
    extraFiles: [
      {
        from: 'backend/build/Release/',
        to: '.',
        filter: ['*.dll']
      }
    ]
  },
  nsis: {
    artifactName: '${name}-${version}-${arch}-setup.${ext}',
    shortcutName: '${productName}',
    uninstallDisplayName: '${productName}',
    createDesktopShortcut: 'always'
  },
  mac: {
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: {
      teamId: process.env.APPLE_TEAM_ID
    }
  },
  dmg: {
    artifactName: '${name}-${version}-${arch}.${ext}'
  },
  linux: {
    target: ['AppImage', 'snap', 'deb'],
    maintainer: 'pierr3',
    category: 'Game'
  },
  appImage: {
    artifactName: '${name}-${version}-${arch}.${ext}'
  },
  npmRebuild: false,
  publish: {
    provider: 'generic',
    url: 'https://example.com/auto-updates'
  },
  electronDownload: {
    mirror: 'https://npmmirror.com/mirrors/electron/'
  }
};
