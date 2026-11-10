import tencentcloud from 'tencentcloud-sdk-slim-nodejs'

const BillingClient = tencentcloud.billing.v20180709.Client

const client = new BillingClient({
  credential: {
    secretId: '',
    secretKey: '',
  },
  region: '', // Billing 接口不需要 region
  profile: {
    signMethod: 'TC3-HMAC-SHA256',
    httpProfile: {
      reqMethod: 'POST',
      reqTimeout: 30,
    },
  },
})

client.DescribeAccountBalance({}).then(
  (data) => {
    // 余额单位是“分”，需要除以 100 转为“元”
    const balanceYuan = data.Balance / 100
    const cashYuan = data.CashAccountBalance / 100
    const presentYuan = data.PresentAccountBalance / 100

    console.log(`可用余额: ¥${balanceYuan.toFixed(2)}`)
    console.log(`现金余额: ¥${cashYuan.toFixed(2)}`)
    console.log(`赠送金余额: ¥${presentYuan.toFixed(2)}`)
    console.log('完整返回:', data)
  },
  (err) => {
    console.error('查询余额失败:', err)
  }
)