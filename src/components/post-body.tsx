import Link from "next/link";

// Support explicit, labelled internal links without interpreting HTML or scripts.
export default function PostBody({ body }: { body: string }) {
  return (
    <div className="body-text">
      {body
        .split(/(\[[^\]\n]+\]\(\/(?:posts|guides)\/[a-zA-Z0-9_-]+\))/g)
        .map((part, index) => {
          const link =
            /^\[([^\]\n]+)\]\((\/(?:posts|guides)\/[a-zA-Z0-9_-]+)\)$/.exec(
              part,
            );
          return link ? (
            <Link key={index} href={link[2]}>
              {link[1]}
            </Link>
          ) : (
            part
          );
        })}
    </div>
  );
}
