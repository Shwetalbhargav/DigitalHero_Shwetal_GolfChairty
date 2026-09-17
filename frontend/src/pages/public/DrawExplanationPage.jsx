import SectionTitle from '../../components/common/SectionTitle.jsx';
import Card from '../../components/common/Card.jsx';
import HowItWorks from '../../components/home/HowItWorks.jsx';
import ScoreDemo from '../../components/home/ScoreDemo.jsx';
import PrizePoolPreview from '../../components/home/PrizePoolPreview.jsx';
export default function DrawExplanationPage() {
  return (
    <div className="home-page draw-explanation">
      <SectionTitle
        as="h1"
        eyebrow="KNOW THE JOURNEY"
        title="Golf, giving and the monthly draw."
        description="Explore demo membership, charitable allocation and reviewed monthly draws. All payments and settlements are simulated."
      />
      <HowItWorks showLink={false} />
      <section
        id="draw-rules"
        tabIndex={-1}
        className="home-section"
        aria-labelledby="rules-title"
      >
        <SectionTitle id="rules-title" title="How the prize tiers work." />
        <div className="two-grid">
          <Card>
            <h3>3, 4 or 5 matches</h3>
            <p>
              Three matches receive 25% of the prize pool, four matches receive
              35%, and five matches receive 40%. Each allocation is divided
              equally among the winners in that tier.
            </p>
            <p>
              Only the five-match jackpot can roll over. The three- and
              four-match shares do not roll into the next draw.
            </p>
            <p>
              Each draw selects five distinct numbers from 1–45. Repeated score
              values count once when matching; an entry receives only its
              highest qualifying tier. Remainder pennies are assigned in a
              stable order by the server.
            </p>
          </Card>
          <Card>
            <h3>Proof first. Payout after.</h3>
            <p>
              Winning a tier does not trigger an instant payment. Winners submit
              proof for verification; payout is a separate step after approval.
            </p>
            <p>
              Draw participation requires active, unsuspended membership and
              five recorded scores at cutoff. Your dashboard shows the next
              configured draw when one exists. Published results preserve your
              entry even if you later edit your scores. Recorded payouts are
              manual/demo settlements, not bank transfers.
            </p>
          </Card>
        </div>
      </section>
      <ScoreDemo />
      <PrizePoolPreview showLink={false} />
    </div>
  );
}
