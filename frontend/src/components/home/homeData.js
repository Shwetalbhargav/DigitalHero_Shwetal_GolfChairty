import juniorGolf from '../../assets/images/home/junior-golf.jpg';
import habitat from '../../assets/images/home/habitat.jpg';
import communitySupport from '../../assets/images/home/community-support.jpg';
export const HERO_IMAGE = {
  src: '/demo-art/community.svg',
  alt: 'Illustration of two neighbours planting a tree together in a community garden.',
};
// These are illustrative cause categories, never seeded or presented as real partners.
export const EXAMPLE_CHARITIES = Object.freeze([
  {
    id: 'youth-access',
    name: 'A first swing. A new possibility.',
    category: 'Youth & opportunity',
    description:
      'Imagine helping young people access equipment, coaching and a welcoming place to play.',
    image: {
      src: juniorGolf,
      alt: 'A young golfer and an adult coach holding a golf bag together on a practice green.',
    },
    href: '/charities#youth-access',
    isExample: true,
  },
  {
    id: 'greener-spaces',
    name: 'Care for the places we play.',
    category: 'Nature & conservation',
    description:
      'Imagine supporting habitats and green spaces that make our communities richer.',
    image: {
      src: habitat,
      alt: 'Wildflowers and a small wetland beside a coastal golf course.',
    },
    href: '/charities#greener-spaces',
    isExample: true,
  },
  {
    id: 'community-connection',
    name: 'More than a round together.',
    category: 'Community & wellbeing',
    description:
      'Imagine creating opportunities to connect, belong and spend time outdoors.',
    image: {
      src: communitySupport,
      alt: 'Four golfers sitting together on a clubhouse bench, talking after a round.',
    },
    href: '/charities#community-connection',
    isExample: true,
  },
]);
export const EXAMPLE_SCORES = Object.freeze([12, 18, 24, 31, 40]);
export const DRAW_EXAMPLES = Object.freeze([
  { matches: 3, numbers: [18, 24, 31, 41, 44] },
  { matches: 4, numbers: [12, 18, 24, 31, 44] },
  { matches: 5, numbers: [12, 18, 24, 31, 40] },
]);
export const PRIZE_TIERS = Object.freeze([
  { matches: 5, label: 'Jackpot', share: 40, amount: 4000 },
  { matches: 4, label: 'Four matches', share: 35, amount: 3500 },
  { matches: 3, label: 'Three matches', share: 25, amount: 2500 },
]);
