import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { OperationsPanels } from './OperationsPanels'
import { parseCustomerObservability, type CustomerObservability } from '@orbis-admin/contracts'
import { observationFixture, customer, event, id } from '../../../packages/contracts/src/customer-observability.fixture'
const data = parseCustomerObservability(observationFixture)
function show(query='',patch:Partial<CustomerObservability>={}) {
  return render(<MemoryRouter><OperationsPanels data={{...data,...patch}} params={new URLSearchParams(query)}/></MemoryRouter>)
}
describe('simple customer dashboard',()=>{
  it('shows actual total and independent full-window login counts as drill-down cards',()=>{
    show('project=orbis-khata',{total:103,unlinked:2,loginTotals:{success:90,failure:7}})
    expect(screen.getByRole('link',{name:/মোট গ্রাহক/})).toHaveAttribute('href','/operations?project=orbis-khata&view=customers')
    expect(screen.getByRole('link',{name:/সফল লগইন/})).toHaveTextContent('90')
    expect(screen.getByText('103')).toBeInTheDocument()
    expect(screen.getByText(/2টি গ্রাহকের/)).toBeInTheDocument()
    expect(screen.queryByRole('table')).toBeNull()
  })
  it('keeps the default and unknown views on the summary and clears stale filters',()=>{
    show('view=unknown&after='+id+'&page=2')
    expect(screen.getByRole('link',{name:/মোট গ্রাহক/})).toHaveAttribute('href','/operations?view=customers')
    expect(screen.getByRole('link',{name:'← ড্যাশবোর্ড'})).toBeInTheDocument()
  })
  it('handles empty and nullable customer rows without inventing an identity',()=>{
    const first=show('view=customers',{customers:[],total:0})
    expect(screen.getByText('এই অ্যাপে সংযুক্ত গ্রাহক পাওয়া যায়নি।')).toBeInTheDocument();first.unmount()
    show('view=customers&page=invalid',{customers:[{...customer,email:null,displayId:null}]})
    expect(screen.getByRole('cell',{name:'1'})).toBeInTheDocument()
    expect(screen.getByText('সেন্ট্রাল পরিচয় অসম্পূর্ণ')).toBeInTheDocument()
  })
  it.each(['-1','1.5','1000000'])('rejects unsafe UI page serial %s',page=>{
    show('view=customers&page='+page)
    expect(screen.getByRole('cell',{name:'1'})).toBeInTheDocument()
  })
  it('shows selected customer details and missing optional fields, or a missing selection',()=>{
    const first=show('customer='+id,{customers:[{...customer,email:null,displayId:null,orbisIdentityId:null,phone:null,lastSignInAt:null,products:[]}]})
    expect(screen.getByText('কোনো অ্যাপের সংযোগ পাওয়া যায়নি।')).toBeInTheDocument()
    expect(screen.getByText('সেন্ট্রাল পরিচয় অসম্পূর্ণ')).toBeInTheDocument();first.unmount()
    const second=show('customer='+id,{customers:[{...customer,phone:'+91'}]})
    expect(screen.getByText('+91')).toBeInTheDocument();second.unmount()
    show('customer=missing');expect(screen.getByText('গ্রাহকের তথ্য পাওয়া যায়নি।')).toBeInTheDocument()
  })
  it('shows only successful logins, resolves known identity and leaves unknown identity explicit',()=>{
    show('view=success',{activity:[{...event,outcome:'success',orbisIdentityId:id},{...event,id:'other',outcome:'success',orbisIdentityId:'unknown'},{...event,id:'signup',action:'signup',outcome:'success'},event]})
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByText(customer.name)).toBeInTheDocument()
    expect(screen.getByText(customer.email)).toBeInTheDocument()
    expect(screen.getByText('পরিচয় অজানা')).toBeInTheDocument()
  })
  it('never matches a null identity to a customer and supports absent contacts',()=>{
    show('view=failure',{customers:[{...customer,orbisIdentityId:null},{...customer,orbisIdentityId:id,email:null}],activity:[event,{...event,id:'other',orbisIdentityId:id}]})
    expect(screen.getByText('পরিচয় অজানা')).toBeInTheDocument()
    expect(screen.getByText('তথ্য নেই')).toBeInTheDocument()
  })
  it.each(['success','failure'])('shows an honest empty %s login list',view=>{
    show('view='+view,{activity:[]})
    expect(screen.getByText('এই সময়ে সংরক্ষিত লগইন পাওয়া যায়নি।')).toBeInTheDocument()
  })
})
