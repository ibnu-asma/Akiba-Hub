import { ProblemSolveCard } from '@/components/student/problem-solve-card';
import type { ProblemDto } from '@/lib/api';
import type { Solver } from '@/lib/student';

/** Problem card — difficulty badge, tags, source, solver avatars + New Solution + open link (SPEC §6.3). */
export function ProblemCard({
  problem,
  solved = false,
  solvers = [],
  myId,
}: {
  problem: ProblemDto;
  showNewSolution?: boolean;
  solved?: boolean;
  solvers?: Solver[];
  myId?: string;
}) {
  return (
    <ProblemSolveCard
      problem={{
        id: problem.id,
        name: problem.name,
        difficulty: problem.difficulty,
        platform: problem.platform,
        tags: problem.tags ?? [],
        link: problem.link,
        createdAt: problem.createdAt,
      }}
      solved={solved}
      solvers={solvers}
      myId={myId}
    />
  );
}
