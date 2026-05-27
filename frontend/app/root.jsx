import { useEffect } from "react";
import "./styles/app.css";

import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration
} from "react-router";

export default function Root() {
  useEffect(() => {
    const daltonicMode = typeof window !== "undefined" && localStorage.getItem("daltonicMode") === "true";
    if (daltonicMode) {
      document.body.classList.add("daltonic-mode");
    } else {
      document.body.classList.remove("daltonic-mode");
    }
  }, []);

  return (
    <html lang="pt-br">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />

        <Meta />
        <Links />
        <link rel="icon" type="image/png" href="/FatecRooms.png" />
        <title>Fatec Rooms</title>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>

      <body>

        <div className="app-wrapper">
          <Outlet />
        </div>

        <ScrollRestoration />
        <Scripts />
        
        {/* UserWay */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(d){
                var s = d.createElement("script");

                s.setAttribute("data-position", "2");
                s.setAttribute("data-account", "dEcXIkLEZp");
                s.setAttribute("src", "https://cdn.userway.org/widget.js");

                (d.body || d.head).appendChild(s);
              })(document);
            `,
          }}
        />


      </body>
    </html>
  );
}