import { useQuery } from "@tanstack/react-query";
import "./ArticlePreview.css";

interface ArticleData {
  parse?: {
    title?: string;
    extract?: string;
  };
}

const getArticlePreview = async (title: string) => {
  if (!title) return null;

  const resp = await fetch(
    `https://en.wikipedia.org/w/api.php?` +
      new URLSearchParams({
        page: title,
        origin: "*",
        action: "parse",
        format: "json",
        prop: "extract",
        exintro: "true",
        exsentences: "2",
        redirects: "true",
      }).toString(),
  );
  return resp.json() as Promise<ArticleData>;
};

interface ArticlePreviewProps {
  title: string;
}

const ArticlePreview = ({ title }: ArticlePreviewProps) => {
  const { data, isFetching } = useQuery({
    queryKey: ["articlePreview", title],
    queryFn: () => getArticlePreview(title),
    enabled: Boolean(title),
    refetchOnWindowFocus: false,
  });

  if (isFetching) {
    return (
      <div className="article-preview">
        <div className="article-preview-loading">Loading...</div>
      </div>
    );
  }

  if (!data?.parse?.extract) {
    return null;
  }

  return (
    <div className="article-preview">
      <h3 className="article-preview-title">{data.parse.title}</h3>
      <p className="article-preview-text">{data.parse.extract}</p>
    </div>
  );
};

export default ArticlePreview;







