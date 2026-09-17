import habitat from '../../assets/images/home/habitat.jpg';
export default function AuthCard({ title, children }) {
  return (
    <div className="auth-card">
      <aside
        className="auth-story"
        style={{
          backgroundImage: `linear-gradient(0deg, #003629ee, #00362988), url(${habitat})`,
        }}
      >
        <p className="eyebrow">PURPOSE-LED GOLF</p>
        <h2>Every round starts with a little purpose.</h2>
        <p>
          Choose a cause close to you. Build a community around the game you
          love.
        </p>
        <p>Demo experience · no real payments</p>
      </aside>
      <section className="auth-content">
        <h1>{title}</h1>
        {children}
      </section>
    </div>
  );
}
