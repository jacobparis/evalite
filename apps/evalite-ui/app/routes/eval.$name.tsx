import { getEvalByName } from "@evalite/core/sdk";
import { average } from "@evalite/core/utils";
import type { MetaFunction } from "@remix-run/node";
import {
  Link,
  NavLink,
  Outlet,
  useLoaderData,
  useSearchParams,
  type ClientLoaderFunctionArgs,
} from "@remix-run/react";
import { XCircleIcon } from "lucide-react";
import React, { useContext } from "react";
import { DisplayInput } from "~/components/display-input";
import { InnerPageLayout } from "~/components/page-layout";
import { getScoreState, Score } from "~/components/score";
import { MyLineChart } from "~/components/ui/line-chart";
import { LiveDate } from "~/components/ui/live-date";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { cn } from "~/lib/utils";
import { TestServerStateContext } from "~/use-subscribe-to-socket";
import { formatTime, isArrayOfRenderedColumns } from "~/utils";

export const meta: MetaFunction<typeof clientLoader> = (args) => {
  return [
    { title: `${(args.data as any)?.name} | Evalite` },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export const clientLoader = async (args: ClientLoaderFunctionArgs) => {
  const searchParams = new URLSearchParams(args.request.url.split("?")[1]);
  const result = await getEvalByName(
    args.params.name!,
    searchParams.get("timestamp")
  );

  return {
    ...result,
    name: args.params.name!,
  };
};

export default function Page() {
  const {
    name,
    evaluation: possiblyRunningEvaluation,
    prevEvaluation,
    history,
  } = useLoaderData<typeof clientLoader>();

  /**
   * There are two evaluations we need to take account of:
   * - possiblyRunningEvaluation: The evaluation that
   * may be currently running
   * - evaluationWithoutLayoutShift: The data from the
   * evaluation that is currently running, but without
   * dangers of layout shift
   *
   * The reason for this is that the evaluation that is
   * currently running may report its results in a way
   * that causes massive layout shift.
   *
   * So, we temporarily show the previous evaluation (if
   * there is one) until the new evaluation is done.
   *
   * If there isn't a previous evaluation, we leave it
   * undefined - which will hide the table.
   */
  let evaluationWithoutLayoutShift:
    | typeof possiblyRunningEvaluation
    | undefined;

  const [search, setSearch] = useSearchParams();

  const mostRecentDate = history[history.length - 1]?.date;
  const timestamp = search.get("timestamp");
  const isViewingLatest = !timestamp || timestamp === mostRecentDate;

  if (possiblyRunningEvaluation.status === "running" && isViewingLatest) {
    // If it's running, and there is a previous evaluation,
    // show the previous one
    if (prevEvaluation) {
      evaluationWithoutLayoutShift = prevEvaluation;
    } else {
      // Otherwise, show empty dataset
      evaluationWithoutLayoutShift = undefined;
    }
  } else {
    evaluationWithoutLayoutShift = possiblyRunningEvaluation;
  }

  const serverState = useContext(TestServerStateContext);

  const showExpectedColumn =
    evaluationWithoutLayoutShift?.results.every(
      (result) => result.expected !== null
    ) ?? false;

  const isTraceRoute = location.pathname.includes("trace");

  const evalScore = average(possiblyRunningEvaluation.results || [], (r) =>
    average(r.scores, (s) => s.score)
  );

  const prevScore = prevEvaluation
    ? average(prevEvaluation.results, (r) => average(r.scores, (s) => s.score))
    : undefined;

  const isRunningEval =
    serverState.isRunningEvalName(name) &&
    evaluationWithoutLayoutShift?.created_at === mostRecentDate;

  return (
    <>
      <InnerPageLayout
        vscodeUrl={`vscode://file${possiblyRunningEvaluation.filepath}`}
        filepath={
          possiblyRunningEvaluation.filepath.split(/(\/|\\)/).slice(-1)[0]!
        }
      >
        <div className="text-gray-600 mb-10 text-sm">
          <h1 className="tracking-tight text-2xl mb-2 font-medium text-gray-700">
            {name}
          </h1>
          <div className="flex items-center">
            <Score
              evalStatus={possiblyRunningEvaluation.status}
              isRunning={isRunningEval}
              score={evalScore}
              state={getScoreState(evalScore, prevScore)}
              resultStatus={undefined}
            ></Score>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <span>{formatTime(possiblyRunningEvaluation.duration)}</span>
            <Separator orientation="vertical" className="h-4 mx-4" />
            <div className="flex items-center space-x-5">
              <LiveDate
                date={possiblyRunningEvaluation.created_at}
                className="block"
              />
              {!isViewingLatest && (
                <>
                  <Link
                    to={`/eval/${name}`}
                    prefetch="intent"
                    className="bg-blue-100 uppercase tracking-wide font-medium text-blue-700 px-3 text-xs py-1 -my-1 rounded"
                  >
                    View Latest
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {history.length > 1 && (
          <div className="mb-10">
            <h2 className="mb-4 font-medium text-lg text-gray-600">History</h2>
            {history.length > 1 && (
              <MyLineChart
                data={history}
                onDotClick={({ date }) => {
                  if (date === mostRecentDate) {
                    setSearch({});
                  } else {
                    setSearch({ timestamp: date });
                  }
                }}
              />
            )}
          </div>
        )}
        {evaluationWithoutLayoutShift?.status === "fail" && (
          <div className="flex gap-4 px-4 my-14">
            <div className="flex-shrink-0">
              <XCircleIcon className="text-red-500 size-7" />
            </div>
            <div className="text-sm text-gray-600 gap-1 flex flex-col">
              <h3 className="font-semibold text-gray-700 mb-1 text-lg">
                Evaluation Failed
              </h3>
              <p>At least one of the runs produced an unexpected error.</p>
              <p>Check the terminal for more information.</p>
            </div>
          </div>
        )}
        {evaluationWithoutLayoutShift && (
          <>
            <h2 className="mb-4 font-medium text-lg text-gray-600">Results</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  {isArrayOfRenderedColumns(
                    evaluationWithoutLayoutShift.results[0]?.rendered_columns
                  ) ? (
                    <>
                      {evaluationWithoutLayoutShift.results[0].rendered_columns.map(
                        (column) => (
                          <TableHead key={column.label}>
                            {column.label}
                          </TableHead>
                        )
                      )}
                    </>
                  ) : (
                    <>
                      <TableHead>Input</TableHead>
                      <TableHead>Output</TableHead>
                      {showExpectedColumn && <TableHead>Expected</TableHead>}
                      {evaluationWithoutLayoutShift.results[0]?.scores
                        .length === 0 && (
                        <TableHead className="border-l">Score</TableHead>
                      )}
                    </>
                  )}
                  {evaluationWithoutLayoutShift.results[0]?.scores.map(
                    (scorer, index) => (
                      <TableHead
                        key={scorer.name}
                        className={cn(index === 0 && "border-l")}
                      >
                        {scorer.name}
                      </TableHead>
                    )
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {evaluationWithoutLayoutShift.results.map((result, index) => {
                  const Wrapper = (props: { children: React.ReactNode }) => (
                    <NavLink
                      prefetch="intent"
                      to={`trace/${index}${timestamp ? `?timestamp=${timestamp}` : ""}`}
                      preventScrollReset
                      className={({ isActive }) => {
                        return cn("block h-full p-4", isActive && "active");
                      }}
                    >
                      {props.children}
                    </NavLink>
                  );
                  return (
                    <TableRow
                      key={JSON.stringify(result.input)}
                      className={cn("has-[.active]:bg-gray-100")}
                    >
                      {isArrayOfRenderedColumns(result.rendered_columns) ? (
                        <>
                          {result.rendered_columns.map((column) => (
                            <td className="align-top">
                              <DisplayInput
                                className={cn(
                                  isRunningEval && "opacity-25",
                                  "transition-opacity"
                                )}
                                input={column.value}
                                shouldTruncateText
                                Wrapper={Wrapper}
                              />
                            </td>
                          ))}
                        </>
                      ) : (
                        <>
                          <td className="align-top">
                            <DisplayInput
                              className={cn(
                                isRunningEval && "opacity-25",
                                "transition-opacity"
                              )}
                              input={result.input}
                              shouldTruncateText
                              Wrapper={Wrapper}
                            />
                          </td>
                          <td className="align-top">
                            <DisplayInput
                              className={cn(
                                isRunningEval && "opacity-25",
                                "transition-opacity"
                              )}
                              input={result.output}
                              shouldTruncateText
                              Wrapper={Wrapper}
                            />
                          </td>
                          {showExpectedColumn && (
                            <td className="align-top">
                              <DisplayInput
                                className={cn(
                                  isRunningEval && "opacity-25",
                                  "transition-opacity"
                                )}
                                input={result.expected}
                                shouldTruncateText
                                Wrapper={Wrapper}
                              />
                            </td>
                          )}
                        </>
                      )}

                      {result.scores.length === 0 && (
                        <td className="border-l">
                          <Wrapper>
                            <Score
                              score={0}
                              isRunning={isRunningEval}
                              resultStatus={result.status}
                              evalStatus={possiblyRunningEvaluation.status}
                              state={"first"}
                            />
                          </Wrapper>
                        </td>
                      )}
                      {result.scores.map((scorer, index) => {
                        const scoreInPreviousEvaluation =
                          prevEvaluation?.results
                            .find((r) => r.input === result.input)
                            ?.scores.find((s) => s.name === scorer.name);
                        return (
                          <td
                            key={scorer.id}
                            className={cn(
                              index === 0 && "border-l",
                              "align-top"
                            )}
                          >
                            <Wrapper>
                              <Score
                                score={scorer.score}
                                isRunning={isRunningEval}
                                resultStatus={result.status}
                                evalStatus={possiblyRunningEvaluation.status}
                                state={getScoreState(
                                  scorer.score,
                                  scoreInPreviousEvaluation?.score
                                )}
                              />
                            </Wrapper>
                          </td>
                        );
                      })}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </>
        )}
      </InnerPageLayout>
      <div
        className={cn(
          "fixed top-0 z-20 h-svh border-l p-2 bg-sidebar overflow-auto",
          "transition-[right] ease-linear shadow-lg duration-300",
          "hidden w-full sm:block sm:right-[-100%] sm:w-[500px] md:w-[600px] lg:w-[800px]",
          isTraceRoute && "block sm:right-0",
          !isTraceRoute && ""
        )}
      >
        <Outlet />
      </div>
    </>
  );
}
