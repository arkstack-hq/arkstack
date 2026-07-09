export default function Index({
  appName: appName_,
  message,
  title: title_,
}: {
  appName: string;
  title: string;
  message: string;
}) {
  const root = document.documentElement
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')

  return (
    <div className="page">
      <div className="brand">
        <div className="logo-wrap">
          <div className="halo"></div>
          <img
            src="https://arkstack.toneflix.net/logo.png"
            alt="Arkstack logo"
          />
        </div>
        <div className="brand-text">
          <h1 className="wordmark">
            Ark<span>stack</span>
          </h1>
          <p className="tagline">Node.js Framework &mdash; Runtime Agnostic</p>
        </div>
      </div>

      <div className="status-row">
        <div className="dot"></div>
        {message}
      </div>

      <div className="divider"></div>

      <div className="cards">
        <div className="card">
          <div className="card-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M13 10H20L11 23V14H4L13 1V10Z"></path>
            </svg>
          </div>
          <div className="card-title">Fast by default</div>
          <div className="card-desc">
            Zero-bloat core. Ships only what you need.
          </div>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M13 18V20H19V22H13C11.8954 22 11 21.1046 11 20V18H8C5.79086 18 4 16.2091 4 14V10H20V14C20 16.2091 18.2091 18 16 18H13ZM16 6H19C19.5523 6 20 6.44772 20 7V9H4V7C4 6.44772 4.44772 6 5 6H8V2H10V6H14V2H16V6ZM12 14.5C12.5523 14.5 13 14.0523 13 13.5C13 12.9477 12.5523 12.5 12 12.5C11.4477 12.5 11 12.9477 11 13.5C11 14.0523 11.4477 14.5 12 14.5Z"></path>
            </svg>
          </div>
          <div className="card-title">Adapters</div>
          <div className="card-desc">
            Express, Fastify, Hono, Koa — swap runtimes freely.
          </div>
        </div>
        <div className="card">
          <div className="card-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M20.0833 10.4999L21.2854 11.2212C21.5221 11.3633 21.5989 11.6704 21.4569 11.9072C21.4146 11.9776 21.3557 12.0365 21.2854 12.0787L11.9999 17.6499L2.71451 12.0787C2.47772 11.9366 2.40093 11.6295 2.54301 11.3927C2.58523 11.3223 2.64413 11.2634 2.71451 11.2212L3.9166 10.4999L11.9999 15.3499L20.0833 10.4999ZM20.0833 15.1999L21.2854 15.9212C21.5221 16.0633 21.5989 16.3704 21.4569 16.6072C21.4146 16.6776 21.3557 16.7365 21.2854 16.7787L12.5144 22.0412C12.1977 22.2313 11.8021 22.2313 11.4854 22.0412L2.71451 16.7787C2.47772 16.6366 2.40093 16.3295 2.54301 16.0927C2.58523 16.0223 2.64413 15.9634 2.71451 15.9212L3.9166 15.1999L11.9999 20.0499L20.0833 15.1999ZM12.5144 1.30864L21.2854 6.5712C21.5221 6.71327 21.5989 7.0204 21.4569 7.25719C21.4146 7.32757 21.3557 7.38647 21.2854 7.42869L11.9999 12.9999L2.71451 7.42869C2.47772 7.28662 2.40093 6.97949 2.54301 6.7427C2.58523 6.67232 2.64413 6.61343 2.71451 6.5712L11.4854 1.30864C11.8021 1.11864 12.1977 1.11864 12.5144 1.30864Z"></path>
            </svg>
          </div>
          <div className="card-title">Structured</div>
          <div className="card-desc">Modular conventions for Node.js.</div>
        </div>
      </div>

      <div className="snippet">
        <div className="snippet-label">get started</div>

        <code>
          <span className="cm">// src/routes/api.ts</span>
          <br />
          <span className="kw">import</span> {'{ Router }'}{' '}
          <span className="kw">from</span>{' '}
          <span className="str">'@arkstack/driver-express'</span>
          <br />
          <br />
          Router.<span className="fn">get</span>(
          <span className="str">'/'</span>, () =&gt; {'{'}
          <br />
          &nbsp;&nbsp;<span className="kw">return</span> {'{'} status:{' '}
          <span className="str">'ok'</span> {'}'}
          <br />
          {'}'})
        </code>
      </div>

      <p className="footer">
        <a href="https://arkstack.toneflix.net/">Docs</a> &nbsp;&middot;&nbsp;
        <a href="https://github.com/arkstack-hq/arkstack">GitHub</a>{' '}
        &nbsp;&middot;&nbsp;
        <a href="https://discord.gg/jmQybxKQ7R">Discord</a>
        <br />
        Arkstack &copy; {new Date().getFullYear()} &mdash; By Toneflix
        Technologies
      </p>
    </div>
  )
}
