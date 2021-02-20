import {promises as fs} from 'fs';
import path from 'upath';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const exampleData = {
  file: '340203_202012.docx',
  date_label: '2020年度',
  start_date: '2020-01-01',
  end_date: '2020-12-31',
  area_name: '弋江区',
  data: [
    {
      title: '健康档案建档率',
      name: '建档率',
      tables: [
        {
          is_rate: true,
          title: '表一: 中心机构总体建档率',
          rows: [
            {
              index: 1,
              name: 'A服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'B服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        },
        {
          is_num: true,
          title: '表二: 中心/卫生院机构（不含下属机构）建档率',
          rows: [
            {
              index: 1,
              name: 'A服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'B服务中心',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        },
        {
          is_rate: true,
          title: '表三：卫生站/卫生室建档率',
          rows: [
            {
              index: 1,
              name: 'C卫生站',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            },
            {
              index: 2,
              name: 'D卫生室',
              value: 2993,
              basic: 123123,
              rate: '90.99%'
            }
          ]
        }
      ]
    }
  ]
};

export default class JxReport {
  async generate(params) {
    //TODO: 调试代码, 正式完成后删除
    if (!params) params = exampleData;
    //读取模板文件
    const content = await fs.readFile('./template.docx', 'binary');
    //新建doc对象
    const doc = new Docxtemplater(new PizZip(content));
    //设置数据
    doc.setData(params);
    //渲染数据
    doc.render();
    //导出文件
    await fs.writeFile(
      path.join('./tmp', params.file),
      doc.getZip().generate({
        type: 'nodebuffer'
      })
    );
  }
}
