import { useState } from 'react';
import Badge from '../common/Badge.jsx';
import Button from '../common/Button.jsx';
import Card from '../common/Card.jsx';
import SectionTitle from '../common/SectionTitle.jsx';
import { DRAW_EXAMPLES, EXAMPLE_SCORES } from './homeData.js';
export default function ScoreDemo() {
  const [selected, setSelected] = useState(3);
  const draw = DRAW_EXAMPLES.find((item) => item.matches === selected).numbers;
  // Fixed, distinct examples explain the comparison; this is not the draw engine.
  const matches = EXAMPLE_SCORES.filter((score) => draw.includes(score));
  function numberRow(numbers, label) {
    return (
      <ol className="score-numbers" aria-label={label}>
        {numbers.map((number) => (
          <li
            className={
              matches.includes(number)
                ? 'score-number score-number--match'
                : 'score-number'
            }
            key={number}
          >
            <span>{number}</span>
            {matches.includes(number) && (
              <>
                <span className="score-check" aria-hidden="true">
                  ✓
                </span>
                <span className="sr-only"> matched</span>
              </>
            )}
          </li>
        ))}
      </ol>
    );
  }
  return (
    <section
      className="home-section home-score-section"
      aria-labelledby="score-demo-title"
    >
      <div>
        <SectionTitle
          id="score-demo-title"
          eyebrow="YOUR GAME, EXPLAINED"
          title="Five scores. A world of possibility."
          description="See how matching scores can qualify for a prize tier. Switch between three simple examples."
        />
        <p className="muted">
          These scores and draw numbers are illustrative, not your records or a
          real draw result. Matches are marked with a tick as well as colour.
        </p>
        <div
          className="score-options"
          role="group"
          aria-label="Choose a match example"
        >
          {DRAW_EXAMPLES.map((example) => (
            <Button
              key={example.matches}
              variant={selected === example.matches ? 'primary' : 'secondary'}
              aria-pressed={selected === example.matches}
              onClick={() => setSelected(example.matches)}
            >
              {example.matches} matches
            </Button>
          ))}
        </div>
      </div>
      <Card className="score-demo-card">
        <Badge variant="warning">Illustrative score example</Badge>
        <h3>Five example scores</h3>
        {numberRow(EXAMPLE_SCORES, 'Five example scores')}
        <div className="score-divider" />
        <h3>Example draw numbers</h3>
        {numberRow(draw, 'Example draw numbers')}
        <p className="score-result" role="status">
          <strong>{matches.length} matches</strong>
          <span>
            {matches.length === 5
              ? 'The jackpot tier in this example.'
              : 'A qualifying tier in this example.'}
          </span>
        </p>
        <p className="small muted">
          No entry was submitted and no prize was won.
        </p>
      </Card>
    </section>
  );
}
