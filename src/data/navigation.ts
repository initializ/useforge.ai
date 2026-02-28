export interface NavItem {
  label: string;
  slug?: string;
  children?: NavItem[];
}

export const docsSidebar: NavItem[] = [
  {
    label: 'Getting Started',
    children: [
      { label: 'Installation', slug: 'getting-started/installation' },
    ],
  },
  {
    label: 'Core Concepts',
    children: [],
  },
  {
    label: 'Security',
    children: [],
  },
  {
    label: 'Skills',
    children: [],
  },
  {
    label: 'Deployment',
    children: [],
  },
  {
    label: 'Reference',
    children: [],
  },
];
