import tencentcloud from 'tencentcloud-sdk-slim-nodejs'

const CvmClient = tencentcloud.cvm.v20170312.Client

// 公共凭证配置
const credential = {
  secretId: '',
  secretKey: '',
}

// 先用一个默认地域创建 client，用于查询地域列表
const defaultClient = new CvmClient({
  credential,
  region: 'ap-guangzhou',
  profile: {
    signMethod: 'TC3-HMAC-SHA256',
    httpProfile: {
      reqMethod: 'POST',
      reqTimeout: 30,
    },
  },
})

async function main() {
  // 1. 获取所有地域列表
  const regionResp = await defaultClient.DescribeRegions({})
  const regionSet = regionResp.RegionSet || []
  console.log(`共获取到 ${regionSet.length} 个地域\n`)

  // 2. 遍历所有地域，逐个查询实例
  const results = await Promise.allSettled(
    regionSet.map(async (regionInfo) => {
      const region = regionInfo.Region
      const client = new CvmClient({
        credential,
        region,
        profile: {
          signMethod: 'TC3-HMAC-SHA256',
          httpProfile: {
            reqMethod: 'POST',
            reqTimeout: 30,
          },
        },
      })

      try {
        const data = await client.DescribeInstances({})
        return {
          region,
          regionName: regionInfo.RegionName,
          totalCount: data.TotalCount,
          instances: data.InstanceSet,
        }
      } catch (err) {
        return {
          region,
          regionName: regionInfo.RegionName,
          error: err.message || err,
        }
      }
    })
  )

  // 3. 汇总输出
  for (const r of results) {
    const info = r.status === 'fulfilled' ? r.value : { error: r.reason }
    if (info.error) {
      console.error(`[${info.region}] ${info.regionName} 查询失败: ${info.error}`)
    } else {
      console.log(
        `[${info.region}] ${info.regionName} 实例总数: ${info.totalCount}`
      )
      info.instances.forEach((inst) => {
        console.log(
          `  - ${inst.InstanceId} | ${inst.InstanceName} | ${inst.State} | ${inst.PublicIpAddresses?.join(', ') || 'N/A'}`
        )
      })
    }
  }
}

main().catch((err) => {
  console.error('执行失败:', err)
  process.exit(1)
})