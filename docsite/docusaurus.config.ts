import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const organizationName = "microsoft";
const projectName = "react-native-macos";
const projectFriendlyName = "React Native macOS";
const githubUrl = "https://github.com/" + organizationName + "/" + projectName;
const mainBranchUrl = githubUrl + "/tree/main";
const docsiteUrl = mainBranchUrl + "/docsite";

const config: Config = {
  title: 'React Native macOS',
  tagline: 'Build native macOS apps using React Native',
  favicon: 'img/favicon.ico',

  url: 'https://' + organizationName + '.github.io',
  baseUrl: "/" + projectName + "/",

  organizationName,  
  projectName,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Explicit trailing slash configuration for GitHub Pages
  trailingSlash: false,

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: docsiteUrl + "/",
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/react-logo.svg',
    navbar: {
      title: projectFriendlyName,
      logo: {
        alt: 'react native logo',
        src: 'img/react-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          label: "Blog",
          position: "right",
          href: "https://devblogs.microsoft.com/react-native/",
        },
        {
          src: "img/github-logo.svg",
          href: githubUrl,
          className: "github-mark-24px",
          position: "right",
          "aria-label": "GitHub repository",
        },
      ],
    },
    footer: {
      logo: {
        src: "img/msoss-light.png",
        srcDark: "img/msoss-dark.png",
        alt: "Microsoft Open Source logo",
        href: "https://opensource.microsoft.com",
      },
      copyright: `Copyright © ${new Date().getFullYear()} Microsoft`,
    },
    prism: {
      theme: prismThemes.vsLight,
      darkTheme: prismThemes.vsDark,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
