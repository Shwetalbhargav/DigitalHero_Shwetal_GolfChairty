import { Link } from 'react-router-dom';
import SectionTitle from '../common/SectionTitle.jsx';
import Card from '../common/Card.jsx';
import { ROUTES } from '../../constants/routes.js';
const steps = [
  {
    title: 'Choose your membership',
    description:
      'An active subscription is required to participate in the monthly draw. Membership is not open in this preview.',
  },
  {
    title: 'Choose a cause',
    description:
      'At least 10% of your subscription goes to your selected charity. You can choose to contribute more.',
  },
  {
    title: 'Record your golf scores',
    description:
      'Record scores from 1 to 45. Your latest five recorded scores form the basis of your entry, with one score per date.',
  },
  {
    title: 'Match 3, 4 or 5',
    description:
      'Three, four and five matches qualify for prize tiers. Winners must submit proof for verification before payout.',
  },
];
export default function HowItWorks({ showLink = true }) {
  return (
    <section
      id="how-it-works"
      className="home-section"
      aria-labelledby="journey-title"
    >
      <SectionTitle
        id="journey-title"
        eyebrow="THE JOURNEY"
        title="Simple. Thoughtful. Purposeful."
        description="A familiar game. A different kind of contribution."
      />
      <ol className="home-steps">
        {steps.map((step, index) => (
          <li key={step.title}>
            <span className="step-number" aria-hidden="true">
              0{index + 1}
            </span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        ))}
      </ol>
      <Card tone="soft" className="home-giving-note">
        <span className="home-giving-icon" aria-hidden="true">
          ♡
        </span>
        <div>
          <h3>Giving is its own reward.</h3>
          <p>
            Your charitable contribution is separate from any prize you might
            win. An independent donation is another way to give; it does not buy
            a draw entry. Donations are not available in this preview.
          </p>
        </div>
        {showLink && (
          <Link className="text-link" to={ROUTES.howItWorks}>
            Read the draw explanation <span aria-hidden="true">→</span>
          </Link>
        )}
      </Card>
    </section>
  );
}
