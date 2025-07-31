<template>
  <div ref="graphContainer" class="graph-container"></div>
</template>


<script setup>

import * as d3 from 'd3'
import { onMounted, ref } from 'vue'
import { parseCsv } from '@/utils/csvParser'

const graphContainer = ref(null)

const csvFiles = [
  //{ path: '/data/Bovinecilia.csv', clusterId: 'bovine' },
  { path: '/data/cyanophoraXL_combmethodbis.csv', clusterId: 'cyano' }
]

onMounted(async () => {
  const nodes = []
  const links = []
  const nodeMap = new Map()
  let counter = 0

  for (const file of csvFiles) {
    const raw = await fetch(file.path).then(r => r.text())
    const parsed = parseCsv(raw)

    parsed.forEach(row => {
      const sourceId = `${file.clusterId}-${row.Protein1}-${row.AbsPos1}`
      const targetId = `${file.clusterId}-${row.Protein2}-${row.AbsPos2}`

      if (!nodeMap.has(sourceId)) {
        nodeMap.set(sourceId, { id: sourceId, cluster: file.clusterId, index: counter++ })
        nodes.push(nodeMap.get(sourceId))
      }
      if (!nodeMap.has(targetId)) {
        nodeMap.set(targetId, { id: targetId, cluster: file.clusterId, index: counter++ })
        nodes.push(nodeMap.get(targetId))
      }

      links.push({
        source: nodeMap.get(sourceId),
        target: nodeMap.get(targetId),
        score: row.Score
      })
    })
  }

  drawGraph(nodes, links)
})

function drawGraph(nodes, links) {
  const width = graphContainer.value.clientWidth
  const height = graphContainer.value.clientHeight

  const svg = d3.select(graphContainer.value)
      .append('svg')
      .attr('width', width)
      .attr('height', height)

  // Groupe pour tout le contenu zoomable
  const zoomGroup = svg.append('g')

  // Zoom/pan
  svg.call(
      d3.zoom()
          .scaleExtent([0.5, 5])
          .on('zoom', ({ transform }) => {
            zoomGroup.attr('transform', transform)
          })
  )

  // Ajoute les liens
  const link = zoomGroup.append('g')
      .attr('stroke', '#aaa')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(links)
      .join('line')

  link.style('opacity', 0)
      .transition()
      .duration(800)
      .style('opacity', 0.6)


  // Ajoute les nœuds avec drag
  const node = zoomGroup.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', 4)
      .attr('fill', d => d.cluster === 'bovine' ? '#f88' : '#88f')
      .call(
          d3.drag()
              .on('start', (event, d) => {
                if (!event.active) simulation.alphaTarget(1).restart()
                d.fx = d.x
                d.fy = d.y
              })
              .on('drag', (event, d) => {
                d.fx = event.x
                d.fy = event.y
              })
              .on('end', (event, d) => {
                if (!event.active) simulation.alphaTarget(0)
                d.fx = null
                d.fy = null
              })
      )
  node.style('opacity', 0)
      .transition()
      .duration(800)
      .style('opacity', 1)
  // Force layout
  const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).distance(20).strength(1.0))
      .force('charge', d3.forceManyBody().strength(-10))
      .force('collide', d3.forceCollide(6))
      .force('clusterX', d3.forceX(d => d.cluster === 'bovine' ? -150 : 150).strength(0.05))
      .force('clusterY', d3.forceY(0).strength(0.05))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .alpha(1).restart()
      .on('tick', () => {
        link
            .attr('x1', d => d.source.x)
            .attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x)
            .attr('y2', d => d.target.y)

        node
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
      })
}

</script>

<style scoped>
.graph-container {
  width: 100vw;
  height: 100vh;
}
</style>

