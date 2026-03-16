interface ProjectCardProps {
  image?: string;
}

export default function ProjectCard({
  image = "https://placehold.co/380x800/111111/222222",
}: ProjectCardProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "20px",
        overflow: "hidden",
        backgroundColor: "#242424",
      }}
    >
      <img
        src={image}
        alt="Project"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          filter: "grayscale(100%)",
          display: "block",
          pointerEvents: "none",
          userSelect: "none",
        }}
      />
    </div>
  );
}
