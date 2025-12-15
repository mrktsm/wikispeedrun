import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import "./WikipediaViewer.css";
import WikipediaSkeleton from "./WikipediaSkeleton";

interface WikiApiArticle {
  parse?: {
    title?: string;
    pageid?: number;
    text?: {
      "*"?: string;
    };
  };
}

const getArticleData = async (language: string, title: string) => {
  if (!title) return null;

  const resp = await fetch(
    `https://${language}.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        page: title,
        origin: "*",
        action: "parse",
        format: "json",
        disableeditsection: "true",
        redirects: "true",
      }).toString()
  );
  return resp.json() as Promise<WikiApiArticle>;
};

interface WikipediaViewerProps {
  initialTitle?: string;
  hideControls?: boolean;
  onArticleNavigate?: (articleName: string) => void;
  onArticleLoaded?: () => void;
  endArticle?: string;
  onDestinationReached?: () => void;
}

const WikipediaViewer = ({
  initialTitle = "React_(JavaScript_library)",
  hideControls = false,
  onArticleNavigate,
  onArticleLoaded,
  endArticle,
  onDestinationReached,
}: WikipediaViewerProps) => {
  const [articleTitle, setArticleTitle] = useState(initialTitle);
  const [language, setLanguage] = useState("en");

  const { data, isFetching, isError } = useQuery({
    queryKey: ["article", articleTitle, language],
    queryFn: () => getArticleData(language, articleTitle),
    enabled: Boolean(articleTitle),
    refetchOnWindowFocus: false,
  });

  // Notify when article loads
  useEffect(() => {
    if (data?.parse?.text && !isFetching && onArticleLoaded) {
      onArticleLoaded();
    }
  }, [data, isFetching, onArticleLoaded]);

  // Detect destination reached
  useEffect(() => {
    if (!endArticle || !data?.parse?.title || !onDestinationReached) return;
    const normalize = (t: string) => t.replace(/\s+/g, "_").toLowerCase();
    if (normalize(data.parse.title) === normalize(endArticle)) {
      onDestinationReached();
    }
  }, [data, endArticle, onDestinationReached]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setArticleTitle(e.target.value);
  };

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value);
  };

  const handleArticleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const link = target.closest("a");

    if (link) {
      const href = link.getAttribute("href");

      // Check if it's a Wikipedia article link (starts with /wiki/)
      if (href && href.startsWith("/wiki/")) {
        e.preventDefault();

        // Extract article title from /wiki/Article_Title
        const newTitle = decodeURIComponent(href.replace("/wiki/", ""));

        // Skip special pages, files, categories, etc.
        if (!newTitle.includes(":")) {
          setArticleTitle(newTitle);
          // Notify parent component about navigation
          if (onArticleNavigate) {
            onArticleNavigate(newTitle);
          }
          // Scroll to the very top when navigating to new article
          document.documentElement.scrollTop = 0;
          document.body.scrollTop = 0;
          window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        }
      } else {
        // Prevent external links from navigating away
        e.preventDefault();
      }
    }
  };

  if (isFetching) {
    return (
      <div className="wikipedia-viewer">
        {!hideControls && (
          <div className="wiki-controls">
            <input
              type="text"
              value={articleTitle}
              onChange={handleTitleChange}
              placeholder="Enter Wikipedia article title"
              className="wiki-input"
            />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="wiki-select"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        )}
        <WikipediaSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="wikipedia-viewer">
        {!hideControls && (
          <div className="wiki-controls">
            <input
              type="text"
              value={articleTitle}
              onChange={handleTitleChange}
              placeholder="Enter Wikipedia article title"
              className="wiki-input"
            />
            <select
              value={language}
              onChange={handleLanguageChange}
              className="wiki-select"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        )}
        <div className="wiki-error">
          Error loading article. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="wikipedia-viewer">
      {!hideControls && (
        <div className="wiki-controls">
          <input
            type="text"
            value={articleTitle}
            onChange={handleTitleChange}
            placeholder="Enter Wikipedia article title"
            className="wiki-input"
          />
          <select
            value={language}
            onChange={handleLanguageChange}
            className="wiki-select"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>
      )}

      {data?.parse?.text?.["*"] && (
        <div className="wiki-article">
          <h1 className="wiki-title">{data.parse.title}</h1>
          <div
            className="wiki-content"
            onClick={handleArticleClick}
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(data.parse.text["*"]),
            }}
          />
        </div>
      )}
    </div>
  );
};

export default WikipediaViewer;
