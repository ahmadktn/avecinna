export default defineAppConfig({
  docus: {
    title: 'Avecinna',
    description: 'Context-Aware Secure Electronic Medical Records (EMR) — Technical Architecture, Zero-Trust CAAC Engine & Cryptographic Merkle Audit Ledger',
    image: '/og-image.png',
    url: 'https://docs.avecinna.vitalsdeck.com.ng',
    socials: {
      github: 'vitalsdeck/avecinna',
    },
    aside: {
      level: 1,
      collapsed: false,
      exclude: [],
    },
    header: {
      logo: false,
      title: 'Avecinna',
      showLinkIcon: true,
      exclude: [],
      fluid: false,
    },
    footer: {
      credits: {
        icon: 'lucide:shield-check',
        text: 'Avecinna Secure EMR — ICSC Hackathon Track C1',
        href: 'https://vitalsdeck.com.ng',
      },
      iconLinks: [
        {
          href: 'https://github.com/vitalsdeck/avecinna',
          icon: 'lucide:github',
          label: 'GitHub',
        },
      ],
    },
  },
});
