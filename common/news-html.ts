type newsType = {
  title: string;
  source: string;
  author?: string;
  date: string;
  content: string;
  virtual_pv: number;
};
function newsHtml(data: newsType) {
  const html = `<!DOCTYPE html>
        <html lang='en'>
        <head>
            <meta name='viewport' content='width=device-width, initial-scale=1'>
            <meta charset='UTF-8'>
                <title>${data.title}</title>
        </head>
        <body>
            <div style="font-size: 24px;font-weight: bold">
                ${data.title}
            </div>
            <div style="display:flex;padding: 10px 0;">
                <div style="flex: 1;overflow: hidden;white-space: nowrap;text-overflow: ellipsis">
                  <span style="font-size: 12px;color:#333;">
                    来源:
                    <span style="color:#888;"> ${data.source}</span>
                  </span>
                  ${
                    data.author
                      ? `<span style="padding:0 2px;font-size: 12px;color:#333;">
                    作者:
                    <span style="color:#888">${data.author}</span>
                  </span>`
                      : ''
                  }
                  <div style="font-size: 12px;color:#888;">
                    ${data.date}
                  </div>
                </div>
                <div>
                  <div style="font-size: 12px;color:#333;text-align: center">浏览量:</div>
                  <div style="font-size: 12px;color:#333;text-align: center">${
                    data.virtual_pv
                  }</div>
                </div>
            </div>
            ${data.content}
        </body>
        <footer style="width: 100%;font-size: 12px;color: #888">
          声明: 该文观点仅代表作者本人、医效通系信息发布平台,医效通仅提供信息存储空间服务
        </footer>
        </html>`;
  return html
    .replace(/\n/g, '')
    .replace(/<img/g, '<img style="max-width:100%;height:100%"')
    .replace(/"/g, "'");
}
export default newsHtml;
