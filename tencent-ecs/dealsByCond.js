import tencentcloud from 'tencentcloud-sdk-slim-nodejs'

const BillingClient = tencentcloud.billing.v20180709.Client

const client = new BillingClient({
  credential: {
    secretId: '',
    secretKey: '',
  },
  region: '', // Billing 接口不需要 region
  profile: { signMethod: 'TC3-HMAC-SHA256', httpProfile: { reqMethod: 'POST', reqTimeout: 30 } },
})

client.DescribeDealsByCond({
  StartTime: '2026-08-01 00:00:00',
  EndTime: '2026-10-01 00:00:00',
  Limit: 20,
  Offset: 0,
  // Status: 4, // 可选，只看已发货的
}).then(res => {
  console.log('订单总数:', res.TotalCount)
  res.Deals?.forEach(deal => {
    console.log(`${deal.ProductName} | ${deal.SubProductName} | ${deal.Status} | ${deal.TotalCost} | ${deal.CreateTime}`)
  })
}, err => console.error(err))