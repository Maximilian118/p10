import React, { useMemo } from "react"
import "./_statisticsView.scss"
import { ChampType } from "../../../../shared/types"
import { ResponsiveLine } from "@nivo/line"
import { ResponsivePie } from "@nivo/pie"
import { ResponsiveBar } from "@nivo/bar"
import { ResponsiveHeatMap } from "@nivo/heatmap"
import { ResponsiveRadar } from "@nivo/radar"
import { ResponsiveStream } from "@nivo/stream"
import {
  getCompletedRounds,
  buildNameMap,
  buildCompetitorColorMap,
  buildPointsProgressionData,
  buildPointsDistributionData,
  buildPerformanceHeatmapData,
  buildPointsStreamData,
  buildWinDistributionData,
  buildDriverPopularityData,
  buildCompetitorRadarData,
  buildGapToLeaderData,
  buildScoringBreakdownData,
  getCompetitorColors,
  getCompetitorKeys,
  nivoTheme,
} from "./statisticsUtility"
import BarChartIcon from "@mui/icons-material/BarChart"

interface StatisticsViewProps {
  champ: ChampType
}

// Championship statistics view displaying 9 Nivo chart sections.
// Shows comprehensive analytics for completed rounds: competitor profiles,
// driver popularity, points progression, heatmaps, win distribution, and more.
const StatisticsView: React.FC<StatisticsViewProps> = ({ champ }) => {
  const completedRounds = useMemo(() => getCompletedRounds(champ.rounds), [champ.rounds])
  const roundCount = completedRounds.length

  // Build abbreviated name map for compact chart labels.
  const nameMap = useMemo(() => buildNameMap(completedRounds), [completedRounds])

  // Build color map once for consistent competitor colors across all charts.
  const colorMap = useMemo(() => buildCompetitorColorMap(completedRounds, nameMap), [completedRounds, nameMap])
  const competitorKeys = useMemo(() => getCompetitorKeys(completedRounds, nameMap), [completedRounds, nameMap])
  const competitorColors = useMemo(
    () => getCompetitorColors(competitorKeys.length),
    [competitorKeys.length],
  )

  // Max points possible per round (position 1 in points structure).
  const maxPointsPerRound = useMemo(() => {
    if (!champ.pointsStructure?.length) return 0
    return Math.max(...champ.pointsStructure.map(p => p.points))
  }, [champ.pointsStructure])

  // Memoized chart data — only recomputes when rounds change.
  const radarData = useMemo(
    () => buildCompetitorRadarData(completedRounds, maxPointsPerRound, nameMap),
    [completedRounds, maxPointsPerRound, nameMap],
  )
  const driverPopularityData = useMemo(
    () => buildDriverPopularityData(completedRounds),
    [completedRounds],
  )
  const pointsProgressionData = useMemo(
    () => buildPointsProgressionData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )
  const pointsDistributionData = useMemo(
    () => buildPointsDistributionData(completedRounds, colorMap, nameMap),
    [completedRounds, colorMap, nameMap],
  )
  const heatmapData = useMemo(
    () => buildPerformanceHeatmapData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )
  const streamData = useMemo(
    () => buildPointsStreamData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )
  const winData = useMemo(
    () => buildWinDistributionData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )
  const gapToLeaderData = useMemo(
    () => buildGapToLeaderData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )
  const scoringBreakdownData = useMemo(
    () => buildScoringBreakdownData(completedRounds, nameMap),
    [completedRounds, nameMap],
  )

  // Empty state when no rounds have been completed yet.
  if (roundCount === 0) {
    return (
      <div className="statistics-view">
        <div className="statistics-view__empty">
          <BarChartIcon style={{ fontSize: 48, color: "#C1C1C1" }} />
          <p className="statistics-view__empty-heading">No Statistics Yet</p>
          <p className="statistics-view__empty-text">
            Complete a round to see championship insights.
          </p>
        </div>
      </div>
    )
  }

  // Build color accessor function for charts using competitor color map.
  const colorAccessor = (name: string): string => colorMap.get(name) ?? "#9E9E9E"

  return (
    <div className="statistics-view">

      {/* Chart 1: Competitor Profiles — radar comparing top 4 across performance dimensions. */}
      {roundCount >= 3 && radarData.length > 0 && (
        <div className="statistics-view__section">
          <h3 className="statistics-view__section-heading">Competitor Profiles</h3>
          <div className="statistics-view__section-chart--radar">
            <ResponsiveRadar
              data={radarData}
              keys={competitorKeys.slice(0, 4)}
              indexBy="stat"
              theme={nivoTheme}
              margin={{ top: 40, right: 80, bottom: 40, left: 80 }}
              maxValue={100}
              gridShape="circular"
              gridLevels={5}
              colors={competitorColors.slice(0, 4)}
              fillOpacity={0.15}
              borderWidth={2}
              dotSize={8}
              dotBorderWidth={2}
              dotBorderColor={{ from: "color" }}
              dotColor="white"
              blendMode="multiply"
              legends={[{
                anchor: "bottom",
                direction: "row",
                translateY: 40,
                itemWidth: 80,
                itemHeight: 14,
                symbolSize: 8,
                symbolShape: "circle",
              }]}
            />
          </div>
        </div>
      )}

      {/* Chart 2: Driver Popularity — top 10 most-bet-on drivers. */}
      {driverPopularityData.length > 0 && (
        <div className="statistics-view__section">
          <h3 className="statistics-view__section-heading">Driver Popularity</h3>
          <div className="statistics-view__section-chart--short">
            <ResponsiveBar
              data={driverPopularityData}
              keys={["picks"]}
              indexBy="driver"
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 50 }}
              layout="horizontal"
              colors={["#E10600"]}
              borderRadius={3}
              padding={0.3}
              enableLabel={true}
              labelTextColor="white"
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
              }}
            />
          </div>
        </div>
      )}

      {/* Chart 3: Points Progression — cumulative grandTotalPoints per competitor. */}
      <div className="statistics-view__section">
        <h3 className="statistics-view__section-heading">Points Progression</h3>
        <div className="statistics-view__section-chart">
          <ResponsiveLine
            data={pointsProgressionData}
            theme={nivoTheme}
            margin={{ top: 20, right: 20, bottom: 10, left: 50 }}
            xScale={{ type: "point" }}
            yScale={{ type: "linear", min: 0, max: "auto", stacked: false }}
            curve="monotoneX"
            lineWidth={2.5}
            enablePoints={true}
            pointSize={6}
            pointBorderWidth={2}
            pointBorderColor={{ from: "serieColor" }}
            pointColor="white"
            colors={competitorColors}
            enableSlices="x"
            axisBottom={null}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              legend: "Points",
              legendOffset: -40,
              legendPosition: "middle",
            }}
            useMesh={true}
          />
        </div>
      </div>

      {/* Chart 4: Points Distribution — donut chart of total points share. */}
      <div className="statistics-view__section">
        <h3 className="statistics-view__section-heading">Points Distribution</h3>
        <div className="statistics-view__section-chart--medium">
          <ResponsivePie
            data={pointsDistributionData}
            theme={nivoTheme}
            margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
            innerRadius={0.6}
            padAngle={1.5}
            cornerRadius={4}
            colors={{ datum: "data.color" }}
            borderWidth={1}
            borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
            arcLinkLabelsSkipAngle={10}
            arcLinkLabelsTextColor="#5B5B61"
            arcLinkLabelsThickness={2}
            arcLinkLabelsColor={{ from: "color" }}
            arcLinkLabelsTextOffset={4}
            arcLabelsSkipAngle={10}
            arcLabelsTextColor="white"
          />
        </div>
      </div>

      {/* Chart 5: Performance Heatmap — competitors x rounds, color intensity = points. */}
      <div className="statistics-view__section">
        <h3 className="statistics-view__section-heading">Performance Heatmap</h3>
        <div className="statistics-view__section-chart--tall">
          <ResponsiveHeatMap
            data={heatmapData}
            theme={nivoTheme}
            margin={{ top: 20, right: 10, bottom: 10, left: 50 }}
            axisTop={null}
            axisBottom={null}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
            }}
            colors={{
              type: "diverging",
              colors: ["#E0E0E0", "#A5D6A7", "#2E7D32"],
              divergeAt: 0.5,
            }}
            emptyColor="#f4f4f4"
            enableLabels={false}
            borderRadius={3}
            borderWidth={2}
            borderColor="white"
          />
        </div>
      </div>

      {/* Chart 6: Points Flow — stacked stream showing per-round points contribution. */}
      {roundCount >= 2 && (
        <div className="statistics-view__section">
          <h3 className="statistics-view__section-heading">Points Flow</h3>
          <div className="statistics-view__section-chart">
            <ResponsiveStream
              data={streamData.data}
              keys={streamData.keys}
              theme={nivoTheme}
              margin={{ top: 20, right: 20, bottom: 10, left: 50 }}
              offsetType="silhouette"
              curve="basis"
              colors={competitorColors}
              fillOpacity={0.85}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.4]] }}
              axisBottom={null}
              axisLeft={null}
            />
          </div>
        </div>
      )}

      {/* Chart 7: Win Distribution — horizontal bars showing wins and runner-ups. */}
      {winData.length > 0 && (
        <div className="statistics-view__section">
          <h3 className="statistics-view__section-heading">Win Distribution</h3>
          <div className="statistics-view__section-chart--short">
            <ResponsiveBar
              data={winData}
              keys={["wins", "runnerUps"]}
              indexBy="competitor"
              theme={nivoTheme}
              margin={{ top: 10, right: 20, bottom: 40, left: 80 }}
              layout="horizontal"
              groupMode="grouped"
              colors={["#FFD700", "#C0C0C0"]}
              borderRadius={3}
              padding={0.3}
              enableLabel={true}
              labelTextColor="white"
              axisBottom={{
                tickSize: 0,
                tickPadding: 8,
              }}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
              }}
              legends={[{
                dataFrom: "keys",
                anchor: "bottom",
                direction: "row",
                translateY: 40,
                itemWidth: 90,
                itemHeight: 14,
                symbolSize: 8,
                symbolShape: "circle",
              }]}
            />
          </div>
        </div>
      )}

      {/* Chart 8: Gap to Leader — points gap from each competitor to the leader. */}
      {roundCount >= 2 && (
        <div className="statistics-view__section">
          <h3 className="statistics-view__section-heading">Gap to Leader</h3>
          <div className="statistics-view__section-chart">
            <ResponsiveLine
              data={gapToLeaderData}
              theme={nivoTheme}
              margin={{ top: 20, right: 20, bottom: 10, left: 50 }}
              xScale={{ type: "point" }}
              yScale={{ type: "linear", min: 0, max: "auto", stacked: false, reverse: true }}
              curve="monotoneX"
              lineWidth={2}
              enablePoints={true}
              pointSize={5}
              pointBorderWidth={2}
              pointBorderColor={{ from: "serieColor" }}
              pointColor="white"
              colors={competitorColors}
              enableArea={true}
              areaOpacity={0.04}
              enableSlices="x"
              axisBottom={null}
              axisLeft={{
                tickSize: 0,
                tickPadding: 8,
                legend: "Points Behind",
                legendOffset: -40,
                legendPosition: "middle",
              }}
            />
          </div>
        </div>
      )}

      {/* Chart 9: Scoring Breakdown — stacked bars showing per-round points by competitor. */}
      <div className="statistics-view__section">
        <h3 className="statistics-view__section-heading">Scoring Breakdown</h3>
        <div className="statistics-view__section-chart">
          <ResponsiveBar
            data={scoringBreakdownData.data}
            keys={scoringBreakdownData.keys}
            indexBy="round"
            theme={nivoTheme}
            margin={{ top: 20, right: 20, bottom: 10, left: 50 }}
            groupMode="stacked"
            colors={(bar) => colorAccessor(String(bar.id))}
            borderRadius={2}
            padding={0.2}
            enableLabel={false}
            axisBottom={null}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              legend: "Points",
              legendOffset: -40,
              legendPosition: "middle",
            }}
          />
        </div>
      </div>
    </div>
  )
}

export default StatisticsView
