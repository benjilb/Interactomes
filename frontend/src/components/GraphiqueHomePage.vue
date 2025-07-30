<template>
  <div ref="graphContainer" class="w-full h-screen"></div>
</template>

<script setup>
import * as d3 from 'd3'
import { onMounted, ref } from 'vue'
import { useDataStore } from '@/store/dataStore'
import csvParser from '@/src/utils/csvParser'

const store = useDataStore()
const graphContainer = ref(null)

const files = [
  { path: 'backend/data/Bovinecilia.csv', clusterId: 'bovine' },
  { path: 'backend/data/cyanophoraXL_combmethodbis.csv', clusterId: 'cyano' }
]

onMounted(async () => {
  const allNodes = []
  const allLinks = []
  let nodeIdCounter = 0
  const nodeMap = new Map()

  for (const file of files) {
    const rawCsv = await fetch(file.path).then(r => r.text())
    const rows = csvParser(rawCsv)

    for (const row of rows) {
      const sourceId = `${file.clusterId}-${row.AbsPos1}`
      const targetId = `${file.clusterId}-${row.AbsPos2}`

      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, { id: sourceId, cluster: file.clusterId, index: nodeIdCounter++ })
        allNodes.push(nodeMap.get(sourceId))
      }
      if (!nodeMap.has(targetId)) {
        nodeMap.set(targetId, { id: targetId, cluster: file.clusterId, index: nodeIdCounter++ })
        allNodes.push(nodeMap.get(targetId))
      }

      allLinks.push({
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId)
      })
    }
  }

  drawGraph(allNodes, allLinks)
})

function drawGraph(nodes, links) {
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  const svg = d3.select(graphContainer.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

  const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(40).strength(0.7))
      .force('charge', d3.forceManyBody().strength(-20))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(8))
      .on('tick', ticked)

  svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)

  svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 4)
      .attr('fill', d => d.cluster === 'bovine' ? '#f88' : '#88f')

  function ticked() {
    svg.selectAll('line')
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y)

    svg.selectAll('circle')
        .attr('cx', d => d.x)
        .attr('cy', d => d.y)
  }
}
</script>

<style scoped>
svg {
  width: 100%;
  height: 100%;
}
</style>
