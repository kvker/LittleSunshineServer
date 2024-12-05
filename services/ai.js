const OpenAI = require('openai')

const openaiConfig = {
  apiKey: process.env.TONGYI_API_KEY,
  baseURL: process.env.TONGYI_BASE_URL
}

const openai = new OpenAI(openaiConfig)

/**
 * AI服务模块
 * @module services/ai
 */

/**
 * 检查内容是否积极向上
 * @async
 * @param {string} content - 需要检查的内容文本
 * @returns {Promise<Object>} 返回检查结果对象
 * @returns {boolean} result.isPositive - 内容是否积极向上
 * @returns {string} result.reason - 判断理由
 * @throws {Error} 当API调用失败时抛出错误
 * @example
 * try {
 *   const result = await onCheckContent('这是一段积极向上的内容');
 *   console.log(result.isPositive); // true
 *   console.log(result.reason); // '这段内容传递了正能量...'
 * } catch (error) {
 *   console.error('检查失败:', error);
 * }
 */

exports.onCheckContent = async function onCheckContent(content) {
  // 根据语言获取对应的提示语
  const getSystemPrompt = () => {
    return '你是一个内容审核助手，专门判断内容是否积极向上。如果内容积极向上，返回 true，否则返回 false。'
  }

  // 获取错误信息
  const getErrorMessage = (locale) => {
    const currentLocale = locales[locale] || locales.zh
    return currentLocale.comment.error.notPositive
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'qwen-plus',
      messages: [
        {
          role: 'system',
          content: getSystemPrompt(locale)
        },
        {
          role: 'user',
          content: `请判断以下内容是否积极向上：${content}`
        }
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'onCheckPositiveContent',
            description: '判断内容是否积极向上',
            parameters: {
              type: 'object',
              properties: {
                isPositive: {
                  type: 'boolean',
                  description: '内容是否积极向上'
                },
                reason: {
                  type: 'string',
                  description: '判断理由'
                }
              },
              required: ['isPositive', 'reason']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'onCheckPositiveContent' } }
    })

    const result = JSON.parse(completion.choices[0].message.tool_calls[0].function.arguments)

    // 如果内容不是积极向上的，使用对应语言的错误信息
    if (!result.isPositive) {
      result.reason = getErrorMessage(locale)
    }

    return result
  } catch (error) {
    console.error('内容审核失败', error)
    throw error
  }
}
